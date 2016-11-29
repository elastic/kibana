import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import Binder from 'ui/binder';
import VislibLibDataProvider from 'ui/vislib/lib/data';
import VislibLibLayoutLayoutProvider from 'ui/vislib/lib/layout/layout';
export default function HandlerBaseClass(Private) {

  const Data = Private(VislibLibDataProvider);
  const Layout = Private(VislibLibLayoutLayoutProvider);

  /**
   * Handles building all the components of the visualization
   *
   * @class Handler
   * @constructor
   * @param vis {Object} Reference to the Vis Class Constructor
   * @param opts {Object} Reference to Visualization constructors needed to
   * create the visualization
   */
  class Handler {
    constructor(vis, opts) {
      this.data = opts.data || new Data(vis.data, vis._attr, vis.uiState);
      this.vis = vis;
      this.el = vis.el;
      this.ChartClass = vis.ChartClass;
      this.charts = [];

      this._attr = _.defaults(vis._attr || {}, {
        'margin': {top: 10, right: 3, bottom: 5, left: 3}
      });

      this.xAxis = opts.xAxis;
      this.yAxis = opts.yAxis;
      this.chartTitle = opts.chartTitle;
      this.axisTitle = opts.axisTitle;
      this.alerts = opts.alerts;

      this.layout = new Layout(vis.el, vis.data, vis._attr.type, opts);
      this.binder = new Binder();
      this.renderArray = _.filter([
        this.layout,
        this.axisTitle,
        this.chartTitle,
        this.alerts,
        this.xAxis,
        this.yAxis,
      ], Boolean);

      // memoize so that the same function is returned every time,
      // allowing us to remove/re-add the same function
      this.getProxyHandler = _.memoize(function (event) {
        const self = this;
        return function (e) {
          self.vis.emit(event, e);
        };
      });

      /**
       * Enables events, i.e. binds specific events to the chart
       * object(s) `on` method. For example, `click` or `mousedown` events.
       *
       * @method enable
       * @param event {String} Event type
       * @param chart {Object} Chart
       * @returns {*}
       */
      this.enable = this.chartEventProxyToggle('on');

      /**
       * Disables events for all charts
       *
       * @method disable
       * @param event {String} Event type
       * @param chart {Object} Chart
       * @returns {*}
       */
      this.disable = this.chartEventProxyToggle('off');
    }
    /**
     * Validates whether data is actually present in the data object
     * used to render the Vis. Throws a no results error if data is not
     * present.
     *
     * @private
     */
    _validateData() {
      const dataType = this.data.type;

      if (!dataType) {
        throw new errors.NoResults();
      }
    };

    /**
     * Renders the constructors that create the visualization,
     * including the chart constructor
     *
     * @method render
     * @returns {HTMLElement} With the visualization child element
     */
    render() {
      const self = this;
      const { binder, charts = [] } = this;
      const selection = d3.select(this.el);

      selection.selectAll('*').remove();

      this._validateData();
      this.renderArray.forEach(function (property) {
        if (typeof property.render === 'function') {
          property.render();
        }
      });

      // render the chart(s)
      let loadedCount = 0;
      const chartSelection = selection.selectAll('.chart');
      chartSelection.each(function (chartData) {
        const chart = new self.ChartClass(self, this, chartData);

        self.vis.activeEvents().forEach(function (event) {
          self.enable(event, chart);
        });

        binder.on(chart.events, 'rendered', () => {
          loadedCount++;
          if (loadedCount === chartSelection.length) {
            // events from all charts are propagated to vis, we only need to fire renderComplete once they all finish
            $(self.el).trigger('renderComplete');
          }
        });

        charts.push(chart);
        chart.render();
      });
    };

    chartEventProxyToggle(method) {
      return function (event, chart) {
        const proxyHandler = this.getProxyHandler(event);

        _.each(chart ? [chart] : this.charts, function (chart) {
          chart.events[method](event, proxyHandler);
        });
      };
    }

    /**
     * Removes all DOM elements from the HTML element provided
     *
     * @method removeAll
     * @param el {HTMLElement} Reference to the HTML Element that
     * contains the chart
     * @returns {D3.Selection|D3.Transition.Transition} With the chart
     * child element removed
     */
    removeAll(el) {
      return d3.select(el).selectAll('*').remove();
    };

    /**
     * Displays an error message in the DOM
     *
     * @method error
     * @param message {String} Error message to display
     * @returns {HTMLElement} Displays the input message
     */
    error(message) {
      this.removeAll(this.el);

      const div = d3.select(this.el)
      .append('div')
      // class name needs `chart` in it for the polling checkSize function
      // to continuously call render on resize
      .attr('class', 'visualize-error chart error');

      if (message === 'No results found') {
        div.append('div')
        .attr('class', 'text-center visualize-error visualize-chart ng-scope')
        .append('div').attr('class', 'item top')
        .append('div').attr('class', 'item')
        .append('h2').html('<i class="fa fa-meh-o"></i>')
        .append('h4').text(message);

        div.append('div').attr('class', 'item bottom');
      } else {
        div.append('h4').text(message);
      }

      $(this.el).trigger('renderComplete');
      return div;
    };

    /**
     * Destroys all the charts in the visualization
     *
     * @method destroy
     */
    destroy() {
      this.binder.destroy();

      this.renderArray.forEach(function (renderable) {
        if (_.isFunction(renderable.destroy)) {
          renderable.destroy();
        }
      });

      this.charts.splice(0).forEach(function (chart) {
        if (_.isFunction(chart.destroy)) {
          chart.destroy();
        }
      });
    };
  }

  return Handler;
};
