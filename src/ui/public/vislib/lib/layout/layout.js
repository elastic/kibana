define(function (require) {
  return function LayoutFactory(Private) {
    let d3 = require('d3');
    let _ = require('lodash');

    let layoutType = Private(require('ui/vislib/lib/layout/layout_types'));

    /**
     * Builds the visualization DOM layout
     *
     * The Layout Constructor is responsible for rendering the visualization
     * layout, which includes all the DOM div elements.
     * Input:
     *   1. DOM div - parent element for which the layout is attached
     *   2. data - data is bound to the div element
     *   3. chartType (e.g. 'histogram') - specifies the layout type to grab
     *
     * @class Layout
     * @constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param data {Object} Elasticsearch query results for this specific chart
     * @param chartType {Object} Reference to chart functions, i.e. Pie
     */
    function Layout(el, data, chartType, opts) {
      if (!(this instanceof Layout)) {
        return new Layout(el, data, chartType, opts);
      }

      this.el = el;
      this.data = data;
      this.opts = opts;
      this.layoutType = layoutType[chartType](this.el, this.data);
    }

    // Render the layout
    /**
     * Renders visualization HTML layout
     * Remove all elements from the current visualization and creates the layout
     *
     * @method render
     */
    Layout.prototype.render = function () {
      this.removeAll(this.el);
      this.createLayout(this.layoutType);
    };

    /**
     * Create the layout based on the json array provided
     * for each object in the layout array, call the layout function
     *
     * @method createLayout
     * @param arr {Array} Json array
     * @returns {*} Creates the visualization layout
     */
    Layout.prototype.createLayout = function (arr) {
      let self = this;

      return _.each(arr, function (obj) {
        self.layout(obj);
      });
    };

    /**
     * Appends a DOM element based on the object keys
     * check to see if reference to DOM element is string but not class selector
     * Create a class selector
     *
     * @method layout
     * @param obj {Object} Instructions for creating the layout of a DOM Element
     * @returns {*} DOM Element
     */
    Layout.prototype.layout = function (obj) {
      if (!obj.parent) {
        throw new Error('No parent element provided');
      }

      if (!obj.type) {
        throw new Error('No element type provided');
      }

      if (typeof obj.type !== 'string') {
        throw new Error(obj.type + ' must be a string');
      }

      if (typeof obj.parent === 'string' && obj.parent.charAt(0) !== '.') {
        obj.parent = '.' + obj.parent;
      }

      let childEl = this.appendElem(obj.parent, obj.type, obj.class);

      if (obj.datum) {
        childEl.datum(obj.datum);
      }

      if (obj.splits) {
        childEl.call(obj.splits, obj.parent, this.opts);
      }

      if (obj.children) {
        let newParent = childEl[0][0];

        _.forEach(obj.children, function (obj) {
          if (!obj.parent) {
            obj.parent = newParent;
          }
        });

        this.createLayout(obj.children);
      }

      return childEl;
    };

    /**
     * Appends a `type` of DOM element to `el` and gives it a class name attribute `className`
     *
     * @method appendElem
     * @param el {HTMLElement} Reference to a DOM Element
     * @param type {String} DOM element type
     * @param className {String} CSS class name
     * @returns {*} Reference to D3 Selection
     */
    Layout.prototype.appendElem = function (el, type, className) {
      if (!el || !type || !className) {
        throw new Error('Function requires that an el, type, and class be provided');
      }

      if (typeof el === 'string') {
        // Create a DOM reference with a d3 selection
        // Need to make sure that the `el` is bound to this object
        // to prevent it from being appended to another Layout
        el = d3.select(this.el)
          .select(el)[0][0];
      }

      return d3.select(el)
        .append(type)
        .attr('class', className);
    };

    /**
     * Removes all DOM elements from DOM element
     *
     * @method removeAll
     * @param el {HTMLElement} Reference to DOM element
     * @returns {D3.Selection|D3.Transition.Transition} Reference to an empty DOM element
     */
    Layout.prototype.removeAll = function (el) {
      return d3.select(el).selectAll('*').remove();
    };

    return Layout;
  };
});
