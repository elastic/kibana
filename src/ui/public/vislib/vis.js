import _ from 'lodash';
import d3 from 'd3';
import Binder from 'ui/binder';
import { KbnError } from 'ui/errors';
import EventsProvider from 'ui/events';
import './styles/main.less';
import VislibLibResizeCheckerProvider from './lib/resize_checker';
import VisConifgProvider from './lib/vis_config';
import VisHandlerProvider from './lib/handler';

export default function VisFactory(Private) {
  const ResizeChecker = Private(VislibLibResizeCheckerProvider);
  const Events = Private(EventsProvider);
  const VisConfig = Private(VisConifgProvider);
  const Handler = Private(VisHandlerProvider);

  /**
   * Creates the visualizations.
   *
   * @class Vis
   * @constructor
   * @param $el {HTMLElement} jQuery selected HTML element
   * @param config {Object} Parameters that define the chart type and chart options
   */
  class Vis extends Events {
    constructor($el, visConfigArgs) {
      super(arguments);
      this.el = $el.get ? $el.get(0) : $el;
      this.binder = new Binder();
      this.visConfigArgs = _.cloneDeep(visConfigArgs);

      // bind the resize function so it can be used as an event handler
      this.resize = _.bind(this.resize, this);
      this.resizeChecker = new ResizeChecker(this.el);
      this.binder.on(this.resizeChecker, 'resize', this.resize);
    }

    hasLegend() {
      return this.visConfigArgs.addLegend;
    }
    /**
     * Renders the visualization
     *
     * @method render
     * @param data {Object} Elasticsearch query results
     */
    render(data, uiState) {
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

      this.visConfig = new VisConfig(this.visConfigArgs, this.data, this.uiState, this.el);

      this.handler = new Handler(this, this.visConfig);
      this._runWithoutResizeChecker('render');
    }

    getLegendLabels() {
      return this.visConfig ? this.visConfig.get('legend.labels', null) : null;
    }

    getLegendColors() {
      return this.visConfig ? this.visConfig.get('legend.colors', null) : null;
    }

    /**
     * Resizes the visualization
     *
     * @method resize
     */
    resize() {
      if (!this.data) {
        return;
      }

      if (this.handler && _.isFunction(this.handler.resize)) {
        this._runOnHandler('resize');
      } else {
        this.render(this.data, this.uiState);
      }
    }

    _runWithoutResizeChecker(method) {
      this.resizeChecker.stopSchedule();
      this._runOnHandler(method);
      this.resizeChecker.saveSize();
      this.resizeChecker.saveDirty(false);
      this.resizeChecker.continueSchedule();
    }

    _runOnHandler(method) {
      try {
        this.handler[method]();
      } catch (error) {

        if (error instanceof KbnError) {
          error.displayToScreen(this.handler);
        } else {
          throw error;
        }

      }
    }

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
    }

    /**
     * Sets attributes on the visualization
     *
     * @method set
     * @param name {String} An attribute name
     * @param val {*} Value to which the attribute name is set
     */
    set(name, val) {
      this.visConfigArgs[name] = val;
      this.render(this.data, this.uiState);
    }

    /**
     * Gets attributes from the visualization
     *
     * @method get
     * @param name {String} An attribute name
     * @returns {*} The value of the attribute name
     */
    get(name) {
      return this.visConfig.get(name);
    }

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
    }

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
    }
  }

  return Vis;
}
