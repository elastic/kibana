import _ from 'lodash';
import d3 from 'd3';
import Binder from 'ui/binder';
import errors from 'ui/errors';
import 'ui/vislib/styles/main.less';
import VislibLibResizeCheckerProvider from 'ui/vislib/lib/resize_checker';
import EventsProvider from 'ui/events';
import VislibLibHandlerHandlerTypesProvider from 'ui/vislib/lib/handler/handler_types';
import VislibVisualizationsVisTypesProvider from 'ui/vislib/visualizations/vis_types';
export default function VisFactory(Private) {


  const ResizeChecker = Private(VislibLibResizeCheckerProvider);
  const Events = Private(EventsProvider);
  const handlerTypes = Private(VislibLibHandlerHandlerTypesProvider);
  const chartTypes = Private(VislibVisualizationsVisTypesProvider);

  /**
   * Creates the visualizations.
   *
   * @class Vis
   * @constructor
   * @param $el {HTMLElement} jQuery selected HTML element
   * @param config {Object} Parameters that define the chart type and chart options
   */
  class Vis extends Events {
    constructor($el, config) {
      super(arguments);
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
    render(data, uiState) {
      const chartType = this._attr.type;

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
        this._uiStateChangeHandler = () => {
          if (document.body.contains(this.el)) {
            this.render(this.data, this.uiState);
          }
        };
        uiState.on('change', this._uiStateChangeHandler);
      }

      this.handler = handlerTypes[chartType](this) || handlerTypes.column(this);
      this._runWithoutResizeChecker('render');
    };

    /**
     * Resizes the visualization
     *
     * @method resize
     */
    resize() {
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

    _runWithoutResizeChecker(method) {
      this.resizeChecker.stopSchedule();
      this._runOnHandler(method);
      this.resizeChecker.saveSize();
      this.resizeChecker.saveDirty(false);
      this.resizeChecker.continueSchedule();
    };

    _runOnHandler(method) {
      try {
        this.handler[method]();
      } catch (error) {

        if (error instanceof errors.KbnError) {
          error.displayToScreen(this.handler);
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
    destroy() {
      const selection = d3.select(this.el).select('.vis-wrapper');

      this.binder.destroy();
      this.resizeChecker.destroy();
      if (this.uiState) this.uiState.off('change', this._uiStateChangeHandler);
      if (this.handler) this._runOnHandler('destroy');

      selection.remove();
    };

    /**
     * Sets attributes on the visualization
     *
     * @method set
     * @param name {String} An attribute name
     * @param val {*} Value to which the attribute name is set
     */
    set(name, val) {
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
    get(name) {
      return this._attr[name];
    };

    /**
     * Turns on event listeners.
     *
     * @param event {String}
     * @param listener{Function}
     * @returns {*}
     */
    on(event, listener) {
      const first = this.listenerCount(event) === 0;
      const ret = Events.prototype.on.call(this, event, listener);
      const added = this.listenerCount(event) > 0;

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
    off(event, listener) {
      const last = this.listenerCount(event) === 1;
      const ret = Events.prototype.off.call(this, event, listener);
      const removed = this.listenerCount(event) === 0;

      // Once all listeners are removed, disable the events in the handler
      if (last && removed && this.handler) this.handler.disable(event);
      return ret;
    };
  }

  return Vis;
};
