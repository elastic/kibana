import d3 from 'd3';
import _ from 'lodash';
import { dataLabel } from 'ui/vislib/lib/_data_label';
import { VislibLibDispatchProvider } from '../lib/dispatch';
import { TooltipProvider } from 'ui/vis/components/tooltip';

export function VislibVisualizationsChartProvider(Private) {

  const Dispatch = Private(VislibLibDispatchProvider);
  const Tooltip = Private(TooltipProvider);
  /**
   * The Base Class for all visualizations.
   *
   * @class Chart
   * @constructor
   * @param handler {Object} Reference to the Handler Class Constructor
   * @param el {HTMLElement} HTML element to which the chart will be appended
   * @param chartData {Object} Elasticsearch query results for this specific chart
   */
  class Chart {
    constructor(handler, el, chartData) {
      this.handler = handler;
      this.chartEl = el;
      this.chartData = chartData;
      this.tooltips = [];

      const events = this.events = new Dispatch(handler);

      if (this.handler.visConfig && this.handler.visConfig.get('addTooltip', false)) {
        const $el = this.handler.el;
        const formatter = this.handler.data.get('tooltipFormatter');

        // Add tooltip
        this.tooltip = new Tooltip('chart', $el, formatter, events);
        this.tooltips.push(this.tooltip);
      }

      this._addIdentifier = _.bind(this._addIdentifier, this);
    }

    /**
     * Renders the chart(s)
     *
     * @method render
     * @returns {HTMLElement} Contains the D3 chart
     */
    render() {
      const selection = d3.select(this.chartEl);

      selection.selectAll('*').remove();
      selection.call(this.draw());
    }

    /**
     * Append the data label to the element
     *
     * @method _addIdentifier
     * @param selection {Object} d3 select object
     */
    _addIdentifier(selection, labelProp) {
      labelProp = labelProp || 'label';
      const labels = this.handler.data.labels;

      function resolveLabel(datum) {
        if (labels.length === 1) return labels[0];
        if (datum[0]) return datum[0][labelProp];
        return datum[labelProp];
      }

      selection.each(function (datum) {
        const label = resolveLabel(datum);
        if (label != null) dataLabel(this, label);
      });
    }

    /**
     * Removes all DOM elements from the root element
     *
     * @method destroy
     */
    destroy() {
      const selection = d3.select(this.chartEl);
      this.events.removeAllListeners();
      this.tooltips.forEach(function (tooltip) {
        tooltip.destroy();
      });
      selection.remove();
    }
  }

  return Chart;
}
