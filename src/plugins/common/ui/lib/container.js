define([
	'aloha/core',
	'aloha/jquery',
	'util/class'
], function( Aloha, jQuery, Class ) {
	'use strict';

	/**
	 * This object provides a unique associative container which maps hashed
	 * `showOn` values (see `generateKeyForShowOnValue()`) with objects that
	 * hold a corresponding `shouldShow` function (which is also derived from
	 * the `showOn` value), and an array of containers which share this
	 * predicate.  The main advantage we get from a hash set is that lookups
	 * can be done in constant time.
	 * @type {object.<string, object>}
	 */
	var showGroups = {};

	/**
	 * Given a `showOn` value, generate a string from a concatenation of its
	 * type and value. We need to include the typeof of the `showOn` value onto
	 * the returned string so that we can distinguish a value of "true"
	 * (string) and a value `true` (boolean) which would be coerced to
	 * different `shouldShow` functions but would otherwise be stringified as
	 * simply "true".
	 * @param {string|boolean|function():boolean} showOn
	 * @return {string} A key that distinguishes the type and value of the
	 *                  given `showOn` value. eg: "boolean:true".
	 */
	function generateKeyForShowOnValue( showOn ) {
		return jQuery.type( showOn ) + ':' + showOn.toString();
	};

	/**
	 * Place the a container into the appropriate a group in the `showGroups`
	 * hash.  Containers with functionally equivalent `showOn` values are
	 * grouped together so that instead of having to perform N number of tests
	 * to determine whether N number of containers should be shown or hidden,
	 * we can instead perform 1 test for N number of containers in many some
	 * cases.
	 * @param {Aloha.ui.Container} container
	 */
	function addToShowGroup( container ) {
		var key = generateKeyForShowOnValue( container.showOn );
		var group = showGroups[ key ];

		if ( group ) {
			group.containers.push( container );
		} else {
			group = showGroups[ key ] = {
				shouldShow: coerceShowOnToPredicate( container.showOn ),
				containers: [ container ]
			};
		}

		container.shouldShow = group.shouldShow;
	};

	/**
	 * Given a value which represents a `showOn` test, coerce the value into a
	 * predicate function.
	 * @param {string|boolean|function():boolean} showOn
	 * @return {function():boolean}
	 */
	function coerceShowOnToPredicate( showOn ) {
		switch( jQuery.type( showOn ) ) {
		case 'function':
			return showOn;
		case 'boolean':
			return function() {
				return showOn;
			};
		case 'string':
			return function( el ) {
				return el ? jQuery( el ).is( showOn ) : false;
			};
		case 'undefined':
			return function() {
				return true;
			};
		default:
			return function() {
				return false;
			};
		}
	};

	/**
	 * Show or hide a set of containers.
	 * @param {Array.<Aloha.ui.Container>} containers
	 * @param {string} action Either "hide" or "show", and nothing else.
	 */
	function toggleContainers( containers, action ) {
		if ( action != 'show' && action != 'hide' ) {
			return;
		}

		var j = containers.length;

		while ( j ) {
			containers[ --j ][ action ]();
		}
	};

	// ------------------------------------------------------------------------
	// API methods, and properties
	// ------------------------------------------------------------------------

	var Container = Class.extend({

		/**
		 * Whether this container is visible of not.
		 * @type {boolean}
		 */
		visible: true,

		/**
		 * Indicates the type of the container: "tab" or "panel".
		 * @type {string}
		 */
		type: 'tab',

		/**
		 * A unique identifier for this container.
		 * @type {string}
		 */
		uid: null,

		/**
		 * The containing (wrapper) element for this container.
		 * @type {jQuery<HTMLElement>}
		 */
		element: null,

		/**
		 * Clickable handle for this container, which pairs with a
		 * corresponding panel element.
		 * @type {jQuery<HTMLElement>}
		 */
		handle: null,

		/**
		 * The panel element for this container on which components will be
		 * rendered.
		 * @type {jQuery<HTMLElement>}
		 */
		panel: null,

		/**
		 * Zero-base index of this container's position in the `surface` that
		 * it is rendered on.
		 * @type {number}
		 */
		index: null,

		/**
		 * True if this tab is activated (ie: having focus, so that not only is
		 * it visible but also top-most, exposing its components for
		 * interaction).
		 * @type {boolean}
		 */
		activated: false,

		/**
		 * A value to test whether this container should be shown when its
		 * `shouldShow` method is invoked.
		 * @param {string|boolean|function():boolean}
		 */
		 showOn: true,

		/**
		 * A predicate that tests whether this container should be shown.  This
		 * done by testing the elements in the current selected range against
		 * the `showOn` value.
		 * @param {Array.<HTMLElement>=} elements A set of elements to test.
		 * @return {boolean} True if this container should be made visible.
		 */
		shouldShow: function() {
			return true;
		},

		/**
		 * Initialize a new container with the specified properties.
		 * @param {object=} settings Optional properties, and override methods.
		 * @constructor
		 */
		_constructor: function( settings ) {
			var init;

			if ( settings ) {
				init = settings.init;
				delete settings.init;
				jQuery.extend( this, settings );
			}

			this.init();

			if ( jQuery.type( init ) == 'function' ) {
				init.call( this );
			}
		},

		init: function() {
			this.onInit.call( this );
			addToShowGroup( this );
		},

		/**
		 * @return {jQuery<HTMLElement>} The element representing the rendered
		 *                               container.
		 */
		render: function() {
			var el = this.element = jQuery( '<div>', {
				'class': 'aloha-ui-container, aloha-ui-tab'
			});

			switch( this.type ) {
			case 'tab':
				break;
			case 'panel':
				break;
			}

			this.onRender.call( this );

			return el;
		},

		show: function() {
			this.element.show();
			this.visible = true;
			this.onShow.call( this );
		},

		hide: function() {
			this.element.hide();
			this.visible = false;
			this.onHide.call( this );
		},

		//
		// Events handlers
		//

		onInit:   function() {},
		onRender: function() {},
		onShow:   function() {},
		onHide:   function() {}

	});

	/**
	 * Given an array of elements, show all containers whose group's
	 * `shouldShow` function returns true for any of the nodes in the `elements`
	 * array. Otherwise hide those containers.
	 *
	 * We test a group of containers instead of individual containers because,
	 * if we were to test each container's `shouldShow` function individually,
	 * we would do so at a cost of O(num_of_elements * N) in any and all cases.
	 * But by grouping containers into sets that have functionally equivalent
	 * `showOn` conditions, we minimize the work we have to do for most cases,
	 * since it is likely that there will often be containers which have the
	 * same condition regarding when they are to be shown.
	 *
	 * Organized our data in this way allows this function to perform 1 *
	 * (number of elements) `shouldShow` test for N containers in most cases,
	 * rather than N * (number of elements) tests for N containers in all
	 * cases.
	 * @param {Array.<HTMLElement>} elements The effective elements any of
	 *                                       which may cause the container to
	 *                                       shown.
	 * @static
	 */
	Container.showContainersForElements = function( elements ) {
		// Add a null object to the elements array so that we can test whether
		// the panel should be activated when we have no effective elements in
		// the current selection.
		elements.push( null );

		for ( var groupKey in showGroups ) {
			var group = showGroups[ groupKey ];
			var shouldShow = group.shouldShow;

			if ( !shouldShow ) {
				continue;
			}

			var j = elements.length;

			while ( j ) {
				if ( shouldShow( elements[ --j ] ) ) {
					toggleContainers( group.containers, 'show' );
					break;
				} else {
					toggleContainers( group.containers, 'hide' );
				}
			}
		}
	};

	// ------------------------------------------------------------------------
	// Tests
	// ------------------------------------------------------------------------

	/*
	var c1 = new Container();
	var c2 = new Container({
		showOn: 'p>i'
	});
	var c3 = new Container({
		showOn: function(el) {
			return el.is('a');
		}
	});
	var c4 = new Container({
		showOn: 'p>i'
	});
	var c5 = new Container({
		showOn: 'p>a'
	});
	*/

	return Container;
});
