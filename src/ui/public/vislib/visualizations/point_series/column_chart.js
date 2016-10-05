import _ from 'lodash';
import moment from 'moment';
import errors from 'ui/errors';
import VislibVisualizationsPointSeriesChartProvider from 'ui/vislib/visualizations/point_series/_point_series_chart';
export default function ColumnChartFactory(Private) {

  const PointSeriesChart = Private(VislibVisualizationsPointSeriesChartProvider);

  const defaults = {
    mode: 'normal',
    showTooltip: true,
    color: undefined, // todo
    fillColor: undefined // todo
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
  class ColumnChart extends PointSeriesChart {
    constructor(handler, chartEl, chartData, seriesConfigArgs) {
      super(handler, chartEl, chartData, seriesConfigArgs);
      this.seriesConfig = _.defaults(seriesConfigArgs || {}, defaults);
    }

    /**
     * Adds SVG rect to Vertical Bar Chart
     *
     * @method addBars
     * @param svg {HTMLElement} SVG to which rect are appended
     * @param layers {Array} Chart data array
     * @returns {D3.UpdateSelection} SVG with rect added
     */
    addBars(svg, data) {
      const self = this;
      const color = this.handler.data.getColorFunc();
      const tooltip = this.baseChart.tooltip;
      const isTooltip = this.seriesConfig.addTooltip;

      const layer = svg.append('g')
      .attr('class', function (d, i) {
        return 'series ' + i;
      });

      const layers = data.values;

      const bars = layer.selectAll('rect')
      .data(layers);

      bars
      .exit()
      .remove();

      bars
      .enter()
      .append('rect')
      .call(this.baseChart._addIdentifier)
      .attr('fill', function (d) {
        return color(d.label || data.label);
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
      const offset = this.seriesConfig.mode;

      if (offset === 'grouped') {
        return this.addGroupedBars(bars);
      }
      return this.addStackedBars(bars);
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
      const height = yScale.range()[0];
      const yMin = yScale.domain()[0];

      let barWidth;
      if (this.getCategoryAxis().axisConfig.isTimeDomain()) {
        const { min, interval } = this.handler.data.get('ordered');
        const start = min;
        const end = moment(min).add(interval).valueOf();

        barWidth = xScale(end) - xScale(start);
        barWidth = barWidth - Math.min(barWidth * 0.25, 15);
      }

      // update
      bars
      .attr('x', function (d) {
        return xScale(d.x);
      })
      .attr('width', function () {
        return barWidth || xScale.rangeBand();
      })
      .attr('y', function (d) {
        return yScale(d.y0 + d.y);
      })
      .attr('height', function (d) {
        if (d.y < 0) {
          return Math.abs(yScale(d.y0 + d.y) - yScale(d.y0));
        }
        // todo:
        // Due to an issue with D3 not returning zeros correctly when using
        // an offset='expand', need to add conditional statement to handle zeros
        // appropriately
        //if (d._input.y === 0) {
        //  return 0;
        //}

        // for split bars or for one series,
        // last series will have d.y0 = 0
        if (d.y0 === 0 && yMin > 0) {
          return yScale(yMin) - yScale(d.y);
        }

        return yScale(d.y0) - yScale(d.y0 + d.y);
      });

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
      const minWidth = 1;
      let barWidth;

      if (isTimeScale) {
        const {min, interval} = this.handler.data.get('ordered');
        const groupWidth = xScale(min + interval) - xScale(min);
        const groupSpacing = groupWidth * groupSpacingPercentage;

        barWidth = (groupWidth - groupSpacing) / n;
      }
      // update
      bars
      .attr('x', function (d) {
        if (isTimeScale) {
          return xScale(d.x) + barWidth * j;
        }
        return xScale(d.x) + xScale.rangeBand() / n * j;
      })
      .attr('width', function () {
        if (barWidth < minWidth) {
          throw new errors.ContainerTooSmall();
        }

        if (isTimeScale) {
          return barWidth;
        }
        return xScale.rangeBand() / n;
      })
      .attr('y', function (d) {
        if (d.y < 0) {
          return yScale(0);
        }

        return yScale(d.y);
      })
      .attr('height', function (d) {
        return Math.abs(yScale(0) - yScale(d.y));
      });

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
