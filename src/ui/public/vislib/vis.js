define(function (require) {
  return function VisFactory(Private) {
    let _ = require('lodash');
    let d3 = require('d3');

    let Binder = require('ui/Binder');

    let ResizeChecker = Private(require('ui/vislib/lib/resize_checker'));
    let Events = Private(require('ui/events'));
    let handlerTypes = Private(require('ui/vislib/lib/handler/handler_types'));
    let chartTypes = Private(require('ui/vislib/visualizations/vis_types'));
    let errors = require('ui/errors');
    require('ui/vislib/styles/main.less');

    /**
     * Creates the visualizations.
     *
     * @class Vis
     * @constructor
     * @param $el {HTMLElement} jQuery selected HTML element
     * @param config {Object} Parameters that define the chart type and chart options
     */
    _.class(Vis).inherits(Events);
    function Vis($el, config) {
      if (!(this instanceof Vis)) {
        return new Vis($el, config);
      }
      Vis.Super.apply(this, arguments);
      this.el = $el.get ? $el.get(0) : $el;
      this.binder = new Binder();
      this.ChartClass = chartTypes[config.type];
      this._attr = _.defaults({}, config || {}, {
        legendOpen: true
      });

      // bind the resize function so it can be used as an event handler
      this.resize = _.bind(this.resize, this);
      this.resizeChecker = new ResizeChecker(this.el);
      this.binder.on(this.resizeChecker, 'resize', this.resize);
    }

    /**
     * Renders the visualization
     *
     * @method render
     * @param data {Object} Elasticsearch query results
     */
    Vis.prototype.render = function (data, uiState) {
      let chartType = this._attr.type;

      if (!data) {
        throw new Error('No valid data!');
      }

      if (this.handler) {
        this.data = null;
        this._runOnHandler('destroy');
      }

      this.data = data;

      if (!this.uiState) {
        this.uiState = uiState;
        uiState.on('change', this._uiStateChangeHandler = () => this.render(this.data, this.uiState));
      }

      this.handler = handlerTypes[chartType](this) || handlerTypes.column(this);
      this._runOnHandler('render');
    };

    /**
     * Resizes the visualization
     *
     * @method resize
     */
    Vis.prototype.resize = function () {
      if (!this.data) {
        // TODO: need to come up with a solution for resizing when no data is available
        return;
      }

      if (this.handler && _.isFunction(this.handler.resize)) {
        this._runOnHandler('resize');
      } else {
        this.render(this.data, this.uiState);
      }
    };

    Vis.prototype._runOnHandler = function (method) {
      try {
        this.handler[method]();
      } catch (error) {
        // If involving height and width of the container, log error to screen.
        // Because we have to wait for the DOM element to initialize, we do not
        // want to throw an error when the DOM `el` is zero
        if (error instanceof errors.ContainerTooSmall ||
          error instanceof errors.InvalidWiggleSelection ||
          error instanceof errors.InvalidLogScaleValues ||
          error instanceof errors.PieContainsAllZeros ||
          error instanceof errors.NotEnoughData ||
          error instanceof errors.NoResults) {
          this.handler.error(error.message);
        } else {
          throw error;
        }
      }
    };

    /**
     * Destroys the visualization
     * Removes chart and all elements associated with it.
     * Removes chart and all elements associated with it.
     * Remove event listeners and pass destroy call down to owned objects.
     *
     * @method destroy
     */
    Vis.prototype.destroy = function () {
      let selection = d3.select(this.el).select('.vis-wrapper');

      this.binder.destroy();
      this.resizeChecker.destroy();
      if (this.uiState) this.uiState.off('change', this._uiStateChangeHandler);
      if (this.handler) this._runOnHandler('destroy');

      selection.remove();
      selection = null;
    };

    /**
     * Sets attributes on the visualization
     *
     * @method set
     * @param name {String} An attribute name
     * @param val {*} Value to which the attribute name is set
     */
    Vis.prototype.set = function (name, val) {
      this._attr[name] = val;
      this.render(this.data, this.uiState);
    };

    /**
     * Gets attributes from the visualization
     *
     * @method get
     * @param name {String} An attribute name
     * @returns {*} The value of the attribute name
     */
    Vis.prototype.get = function (name) {
      return this._attr[name];
    };

    /**
     * Turns on event listeners.
     *
     * @param event {String}
     * @param listener{Function}
     * @returns {*}
     */
    Vis.prototype.on = function (event, listener) {
      let first = this.listenerCount(event) === 0;
      let ret = Events.prototype.on.call(this, event, listener);
      let added = this.listenerCount(event) > 0;

      // if this is the first listener added for the event
      // enable the event in the handler
      if (first && added && this.handler) this.handler.enable(event);

      return ret;
    };

    /**
     * Turns off event listeners.
     *
     * @param event {String}
     * @param listener{Function}
     * @returns {*}
     */
    Vis.prototype.off = function (event, listener) {
      let last = this.listenerCount(event) === 1;
      let ret = Events.prototype.off.call(this, event, listener);
      let removed = this.listenerCount(event) === 0;

      // Once all listeners are removed, disable the events in the handler
      if (last && removed && this.handler) this.handler.disable(event);
      return ret;
    };

    return Vis;
  };
});
