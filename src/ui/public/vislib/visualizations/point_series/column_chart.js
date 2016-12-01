import _ from 'lodash';
import moment from 'moment';
import errors from 'ui/errors';
import VislibVisualizationsPointSeriesProvider from './_point_series';
export default function ColumnChartFactory(Private) {

  const PointSeries = Private(VislibVisualizationsPointSeriesProvider);

  const defaults = {
    mode: 'normal',
    showTooltip: true,
    color: undefined,
    fillColor: undefined
  };
  /**
   * Vertical Bar Chart Visualization: renders vertical and/or stacked bars
   *
   * @class ColumnChart
   * @constructor
   * @extends Chart
   * @param handler {Object} Reference to the Handler Class Constructor
   * @param el {HTMLElement} HTML element to which the chart will be appended
   * @param chartData {Object} Elasticsearch query results for this specific chart
   */
  class ColumnChart extends PointSeries {
    constructor(handler, chartEl, chartData, seriesConfigArgs) {
      super(handler, chartEl, chartData, seriesConfigArgs);
      this.seriesConfig = _.defaults(seriesConfigArgs || {}, defaults);
    }

    addBars(svg, data) {
      const self = this;
      const color = this.handler.data.getColorFunc();
      const tooltip = this.baseChart.tooltip;
      const isTooltip = this.handler.visConfig.get('tooltip.show');

      const layer = svg.append('g')
      .attr('class', function (d, i) {
        return 'series ' + i;
      });

      const bars = layer.selectAll('rect')
      .data(data.values);

      bars
      .exit()
      .remove();

      bars
      .enter()
      .append('rect')
      .attr('data-label', data.label)
      .attr('fill', () => {
        return color(data.label);
      });

      self.updateBars(bars);

      // Add tooltip
      if (isTooltip) {
        bars.call(tooltip.render());
      }

      return bars;
    };

    /**
     * Determines whether bars are grouped or stacked and updates the D3
     * selection
     *
     * @method updateBars
     * @param bars {D3.UpdateSelection} SVG with rect added
     * @returns {D3.UpdateSelection}
     */
    updateBars(bars) {
      if (this.seriesConfig.mode === 'stacked') {
        return this.addStackedBars(bars);
      }
      return this.addGroupedBars(bars);

    };

    /**
     * Adds stacked bars to column chart visualization
     *
     * @method addStackedBars
     * @param bars {D3.UpdateSelection} SVG with rect added
     * @returns {D3.UpdateSelection}
     */
    addStackedBars(bars) {
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.getValueAxis().getScale();
      const isHorizontal = this.getCategoryAxis().axisConfig.isHorizontal();
      const height = yScale.range()[0];
      const yMin = yScale.domain()[0];

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
        return yScale(d.y0 + d.y);
      }

      function widthFunc() {
        return barWidth || xScale.rangeBand();
      }

      function heightFunc(d) {
        if (d.y < 0) {
          return Math.abs(yScale(d.y0 + d.y) - yScale(d.y0));
        }
        // for split bars or for one series,
        // last series will have d.y0 = 0
        if (d.y0 === 0 && yMin > 0) {
          return yScale(yMin) - yScale(d.y);
        }

        return Math.abs(yScale(d.y0) - yScale(d.y0 + d.y));
      }

      // update
      bars
      .attr('x', isHorizontal ? x : function (d) {
        return yScale(d.y0);
      })
      .attr('width', isHorizontal ? widthFunc : heightFunc)
      .attr('y', isHorizontal ? y : x)
      .attr('height', isHorizontal ? heightFunc : widthFunc);

      return bars;
    };

    /**
     * Adds grouped bars to column chart visualization
     *
     * @method addGroupedBars
     * @param bars {D3.UpdateSelection} SVG with rect added
     * @returns {D3.UpdateSelection}
     */
    addGroupedBars(bars) {
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.getValueAxis().getScale();
      const n = this.getGroupedCount();
      const j = this.getGroupedNum(this.chartData);
      const height = yScale.range()[0];
      const groupSpacingPercentage = 0.15;
      const isTimeScale = this.getCategoryAxis().axisConfig.isTimeDomain();
      const isHorizontal = this.getCategoryAxis().axisConfig.isHorizontal();
      const isLogScale = this.getValueAxis().axisConfig.isLogScale();
      const minWidth = 1;
      let barWidth;

      if (isTimeScale) {
        const {min, interval} = this.handler.data.get('ordered');
        let groupWidth = xScale(min + interval) - xScale(min);
        if (!isHorizontal) groupWidth *= -1;
        const groupSpacing = groupWidth * groupSpacingPercentage;

        barWidth = (groupWidth - groupSpacing) / n;
      }

      function x(d) {
        if (isTimeScale) {
          return xScale(d.x) + barWidth * j;
        }
        return xScale(d.x) + xScale.rangeBand() / n * j;
      }

      function y(d) {
        if (d.y < 0) {
          return yScale(0);
        }

        return yScale(d.y);
      }

      function widthFunc() {
        if (barWidth < minWidth) {
          throw new errors.ContainerTooSmall();
        }

        if (isTimeScale) {
          return barWidth;
        }
        return xScale.rangeBand() / n;
      }

      function heightFunc(d) {
        const baseValue = isLogScale ? 1 : 0;
        return Math.abs(yScale(baseValue) - yScale(d.y));
      }

      // update
      bars
      .attr('x', isHorizontal ? x : 0)
      .attr('width', isHorizontal ? widthFunc : heightFunc)
      .attr('y', isHorizontal ? y : x)
      .attr('height', isHorizontal ? heightFunc : widthFunc);

      return bars;
    };

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the vertical bar chart
     */
    draw() {
      const self = this;

      return function (selection) {
        selection.each(function () {
          const svg = self.chartEl.append('g');
          svg.data([self.chartData]);

          const bars = self.addBars(svg, self.chartData);
          self.addCircleEvents(bars);

          self.events.emit('rendered', {
            chart: self.chartData
          });

          return svg;
        });
      };
    };
  }

  return ColumnChart;
};
