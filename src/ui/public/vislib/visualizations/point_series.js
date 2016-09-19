import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import VislibVisualizationsPointSeriesChartProvider from 'ui/vislib/visualizations/_point_series_chart';
import VislibVisualizationsTimeMarkerProvider from 'ui/vislib/visualizations/time_marker';

export default function PointSeriesFactory(Private) {

  const PointSeriesChart = Private(VislibVisualizationsPointSeriesChartProvider);
  const TimeMarker = Private(VislibVisualizationsTimeMarkerProvider);

  /**
   * Line Chart Visualization
   *
   * @class PointSeries
   * @constructor
   * @extends Chart
   * @param handler {Object} Reference to the Handler Class Constructor
   * @param el {HTMLElement} HTML element to which the chart will be appended
   * @param chartData {Object} Elasticsearch query results for this specific chart
   */
  class PointSeries extends PointSeriesChart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);

      this.handler = handler;
      this.chartData = chartData;
      this.chartEl = chartEl;
      this._attr = handler._attr.chart;
      this.handler.pointSeries = this;
    }

    mapData(data, chart) {
      const config = chart._attr;
      const shouldStack = config.mode === 'stacked';

      return _.map(data.values, val => {
        const valueAxis = config.valueAxis || chart.handler.valueAxes[0].id;
        let y0 = 0;
        if (shouldStack) {
          if (!this.stackedData[valueAxis]) this.stackedData[valueAxis] = {};
          y0 = this.stackedData[valueAxis][val.x] ? this.stackedData[valueAxis][val.x] : 0;
          this.stackedData[valueAxis][val.x] = y0 + val.y;
        }
        return {
          label: data.label,
          x: val.x,
          y: val.y,
          y0: y0,
          z: val.z,
          _input: val
        };
      });
    };

    addClipPath(svg, width, height) {
      // Prevents circles from being clipped at the top of the chart
      const startX = 0;
      const startY = 0;
      const id = 'chart-area' + _.uniqueId();

      // Creating clipPath
      return svg
      .attr('clip-path', 'url(#' + id + ')')
      .append('clipPath')
      .attr('id', id)
      .append('rect')
      .attr('x', startX)
      .attr('y', startY)
      .attr('width', width)
      .attr('height', height);
    };

    addEvents(svg) {
      const isBrushable = this.events.isBrushable();
      if (isBrushable) {
        const brush = this.events.addBrushEvent(svg);
        return svg.call(brush);
      }
    };

    validateDataCompliesWithScalingMethod(data) {
      function valuesSmallerThanOne(d) {
        return d.values && d.values.some(e => e.y < 1);
      }

      const invalidLogScale = data.series && data.series.some(valuesSmallerThanOne);
      if (this._attr.scale === 'log' && invalidLogScale) {
        throw new errors.InvalidLogScaleValues();
      }
    };

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the line chart
     */
    draw() {
      // todo: do we need to handle width and height here ?
      let self = this;
      let $elem = $(this.chartEl);
      let margin = this.handler.style.margin;
      let elWidth = this._attr.width = this.handler._attr.width = $elem.width();
      let elHeight = this._attr.height = this.handler._attr.height = $elem.height();
      let xScale = this.handler.categoryAxes[0].getScale();
      let minWidth = 20;
      let minHeight = 20;
      let addTimeMarker = this._attr.addTimeMarker;
      let times = this._attr.times || [];
      let timeMarker;
      let div;
      let svg;
      let width;
      let height;

      return function (selection) {
        selection.each(function (data) {
          const el = this;

          width = elWidth - margin.left - margin.right;
          height = elHeight - margin.top - margin.bottom;
          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }
          self.validateDataCompliesWithScalingMethod(data);

          if (addTimeMarker) {
            timeMarker = new TimeMarker(times, xScale, height);
          }

          div = d3.select(el);

          svg = div.append('svg')
          .attr('width', elWidth)
          .attr('height', elHeight)
          .append('g')
          .attr('transform', 'translate(0,' + margin.top + ')');

          self.addClipPath(svg, width, height);

          self.stackedData = {};
          const chartTypes = self.handler.chartTypes;
          _.each(self._attr.series, (seri, i) => {
            const chart = new chartTypes[seri.type || self.handler._attr.type](self.handler, svg, data.series[i], seri);
            chart.events = self.events;
            svg.call(chart.draw());
          });

          self.addEvents(svg);
          self.createEndZones(svg);

          if (addTimeMarker) {
            timeMarker.render(svg);
          }

          return svg;
        });
      };
    };
  }

  return PointSeries;
};
