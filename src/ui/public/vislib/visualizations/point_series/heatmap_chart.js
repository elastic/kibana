import _ from 'lodash';
import moment from 'moment';
import VislibVisualizationsPointSeriesProvider from './_point_series';
import colorFunc from 'ui/vislib/components/color/heatmap_color';

export default function HeatmapChartFactory(Private) {

  const PointSeries = Private(VislibVisualizationsPointSeriesProvider);

  const defaults = {
    color: undefined, // todo
    fillColor: undefined // todo
  };
  /**
   * Line Chart Visualization
   *
   * @class HeatmapChart
   * @constructor
   * @extends Chart
   * @param handler {Object} Reference to the Handler Class Constructor
   * @param el {HTMLElement} HTML element to which the chart will be appended
   * @param chartData {Object} Elasticsearch query results for this specific chart
   */
  class HeatmapChart extends PointSeries {
    constructor(handler, chartEl, chartData, seriesConfigArgs) {
      super(handler, chartEl, chartData, seriesConfigArgs);
      this.seriesConfig = _.defaults(seriesConfigArgs || {}, defaults);
    }

    addSquares(svg, data) {
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.handler.valueAxes[1].getScale();
      const zScale = this.getValueAxis().getScale();
      const ordered = this.handler.data.get('ordered');
      const tooltip = this.baseChart.tooltip;
      const isTooltip = this.handler.visConfig.get('tooltip.show');
      const isHorizontal = this.getCategoryAxis().axisConfig.isHorizontal();
      const colorsNumber = this.handler.visConfig.get('colorsNumber');
      const setColorRange = this.handler.visConfig.get('setColorRange');
      const colorsRange = this.handler.visConfig.get('colorsRange');
      const color = this.handler.data.getColorFunc();

      const layer = svg.append('g')
        .attr('class', 'series');

      const squares = layer
        .selectAll('rect')
        .data(data.values);

      squares
        .exit()
        .remove();

      let barWidth;
      if (this.getCategoryAxis().axisConfig.isTimeDomain()) {
        const { min, interval } = this.handler.data.get('ordered');
        const start = min;
        const end = moment(min).add(interval).valueOf();

        barWidth = xScale(end) - xScale(start);
        if (!isHorizontal) barWidth *= -1;
        barWidth = barWidth - Math.min(barWidth * 0.25, 15);
      }

      function x(d) {
        return xScale(d.x);
      }

      function y(d) {
        return yScale(d.series);
      }

      const [min, max] = zScale.domain();
      function getColorBucket(d) {
        let val = 0;
        if (setColorRange && colorsRange.length) {
          if (d.y < colorsRange[0].value) return -1;
          while (val + 1 < colorsRange.length && d.y > colorsRange[val + 1].value) val++;
        } else {
          if (isNaN(min) || isNaN(max)) {
            val = colorsNumber - 1;
          } else {
            val = (d.y - min) / (max - min); /* get val from 0 - 1 */
            val = Math.floor(val * (colorsNumber - 1));
          }
        }
        return val;
      }

      function label(d) {
        const colorBucket = getColorBucket(d);
        let label;
        if (colorBucket < 0) return '';
        const val = Math.ceil(colorBucket * (100 / colorsNumber));
        if (setColorRange) {
          const greaterThan = colorsRange[colorBucket].value;
          label = `> ${greaterThan}`;
        } else {
          const nextVal = Math.ceil((colorBucket + 1) * (100 / colorsNumber));
          label = `${val}% - ${nextVal}%`;
        }
        return label;
      }

      function z(d) {
        if (label(d) === '') return 'transparent';
        return color(label(d));
      }

      function widthFunc() {
        return barWidth || xScale.rangeBand();
      }

      function heightFunc() {
        return yScale.rangeBand();
      }

      squares
        .enter()
        .append('rect')
        .attr('x', isHorizontal ? x : y)
        .attr('width', isHorizontal ? widthFunc : heightFunc)
        .attr('y', isHorizontal ? y : x)
        .attr('height', isHorizontal ? heightFunc : widthFunc)
        .attr('data-label', label)
        .attr('fill', z)
        .attr('style', 'cursor: pointer');

      if (isTooltip) {
        squares.call(tooltip.render());
      }

      return squares;
    };

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the line chart
     */
    draw() {
      const self = this;

      return function (selection) {
        selection.each(function () {
          const svg = self.chartEl.append('g');
          svg.data([self.chartData]);

          const squares = self.addSquares(svg, self.chartData);
          self.addCircleEvents(squares);

          self.events.emit('rendered', {
            chart: self.chartData
          });

          return svg;
        });
      };
    };
  }

  return HeatmapChart;
};
