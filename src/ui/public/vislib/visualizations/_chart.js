define(function (require) {
  return function ChartBaseClass(Private) {
    let d3 = require('d3');
    let _ = require('lodash');
    let errors = require('ui/errors');

    let Dispatch = Private(require('ui/vislib/lib/dispatch'));
    let Tooltip = Private(require('ui/vislib/components/Tooltip'));
    let dataLabel = require('ui/vislib/lib/_data_label');

    /**
     * The Base Class for all visualizations.
     *
     * @class Chart
     * @constructor
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param chartData {Object} Elasticsearch query results for this specific chart
     */
    function Chart(handler, el, chartData) {
      if (!(this instanceof Chart)) {
        return new Chart(handler, el, chartData);
      }

      this.handler = handler;
      this.chartEl = el;
      this.chartData = chartData;
      this.tooltips = [];

      let events = this.events = new Dispatch(handler);

      if (_.get(this.handler, '_attr.addTooltip')) {
        let $el = this.handler.el;
        let formatter = this.handler.data.get('tooltipFormatter');

        // Add tooltip
        this.tooltip = new Tooltip('chart', $el, formatter, events);
        this.tooltips.push(this.tooltip);
      }

      this._attr = _.defaults(this.handler._attr || {}, {});
      this._addIdentifier = _.bind(this._addIdentifier, this);
    }

    /**
     * Renders the chart(s)
     *
     * @method render
     * @returns {HTMLElement} Contains the D3 chart
     */
    Chart.prototype.render = function () {
      let selection = d3.select(this.chartEl);

      selection.selectAll('*').remove();
      selection.call(this.draw());
    };

    /**
     * Append the data label to the element
     *
     * @method _addIdentifier
     * @param selection {Object} d3 select object
     */
    Chart.prototype._addIdentifier = function (selection, labelProp) {
      labelProp = labelProp || 'label';
      let labels = this.handler.data.labels;

      function resolveLabel(datum) {
        if (labels.length === 1) return labels[0];
        if (datum[0]) return datum[0][labelProp];
        return datum[labelProp];
      }

      selection.each(function (datum) {
        let label = resolveLabel(datum);
        if (label != null) dataLabel(this, label);
      });
    };

    /**
     * Removes all DOM elements from the root element
     *
     * @method destroy
     */
    Chart.prototype.destroy = function () {
      let selection = d3.select(this.chartEl);
      this.events.removeAllListeners();
      this.tooltips.forEach(function (tooltip) {
        tooltip.destroy();
      });
      selection.remove();
      selection = null;
    };

    return Chart;
  };
});
