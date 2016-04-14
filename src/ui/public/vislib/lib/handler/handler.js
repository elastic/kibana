define(function (require) {
  return function HandlerBaseClass(Private) {
    let d3 = require('d3');
    let _ = require('lodash');
    let errors = require('ui/errors');
    let Binder = require('ui/Binder');

    let Data = Private(require('ui/vislib/lib/data'));
    let Layout = Private(require('ui/vislib/lib/layout/layout'));

    /**
     * Handles building all the components of the visualization
     *
     * @class Handler
     * @constructor
     * @param vis {Object} Reference to the Vis Class Constructor
     * @param opts {Object} Reference to Visualization constructors needed to
     * create the visualization
     */
    function Handler(vis, opts) {
      if (!(this instanceof Handler)) {
        return new Handler(vis, opts);
      }

      this.data = opts.data || new Data(vis.data, vis._attr, vis.uiState);
      this.vis = vis;
      this.el = vis.el;
      this.ChartClass = vis.ChartClass;
      this.charts = [];

      this._attr = _.defaults(vis._attr || {}, {
        'margin' : { top: 10, right: 3, bottom: 5, left: 3 }
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
        let self = this;
        return function (e) {
          self.vis.emit(event, e);
        };
      });
    }

    /**
     * Validates whether data is actually present in the data object
     * used to render the Vis. Throws a no results error if data is not
     * present.
     *
     * @private
     */
    Handler.prototype._validateData = function () {
      let dataType = this.data.type;

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
    Handler.prototype.render = function () {
      let self = this;
      let charts = this.charts = [];
      let selection = d3.select(this.el);

      selection.selectAll('*').remove();

      this._validateData();
      this.renderArray.forEach(function (property) {
        if (typeof property.render === 'function') {
          property.render();
        }
      });

      // render the chart(s)
      selection.selectAll('.chart')
      .each(function (chartData) {
        let chart = new self.ChartClass(self, this, chartData);

        self.vis.activeEvents().forEach(function (event) {
          self.enable(event, chart);
        });

        charts.push(chart);
        chart.render();
      });
    };


    /**
     * Enables events, i.e. binds specific events to the chart
     * object(s) `on` method. For example, `click` or `mousedown` events.
     *
     * @method enable
     * @param event {String} Event type
     * @param chart {Object} Chart
     * @returns {*}
     */
    Handler.prototype.enable = chartEventProxyToggle('on');

    /**
     * Disables events for all charts
     *
     * @method disable
     * @param event {String} Event type
     * @param chart {Object} Chart
     * @returns {*}
     */
    Handler.prototype.disable = chartEventProxyToggle('off');


    function chartEventProxyToggle(method) {
      return function (event, chart) {
        let proxyHandler = this.getProxyHandler(event);

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
    Handler.prototype.removeAll = function (el) {
      return d3.select(el).selectAll('*').remove();
    };

    /**
     * Displays an error message in the DOM
     *
     * @method error
     * @param message {String} Error message to display
     * @returns {HTMLElement} Displays the input message
     */
    Handler.prototype.error = function (message) {
      this.removeAll(this.el);

      let div = d3.select(this.el)
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
        return div;
      }

      return div.append('h4').text(message);
    };

    /**
     * Destroys all the charts in the visualization
     *
     * @method destroy
     */
    Handler.prototype.destroy = function () {
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

    return Handler;
  };
});
