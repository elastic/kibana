import d3 from 'd3';
import _ from 'lodash';
import VislibVisualizationsPointSeriProvider from 'ui/vislib/visualizations/point_series/_point_seri';
export default function LineChartFactory(Private) {

  const PointSeri = Private(VislibVisualizationsPointSeriProvider);

  const defaults = {
    mode: 'normal',
    showCircles: true,
    radiusRatio: 9,
    showLines: true,
    smoothLines: false,
    interpolate: 'linear',
    color: undefined, // todo
    fillColor: undefined // todo
  };
  /**
   * Line Chart Visualization
   *
   * @class LineChart
   * @constructor
   * @extends Chart
   * @param handler {Object} Reference to the Handler Class Constructor
   * @param el {HTMLElement} HTML element to which the chart will be appended
   * @param chartData {Object} Elasticsearch query results for this specific chart
   */
  class LineChart extends PointSeri {
    constructor(handler, chartEl, chartData, seriesConfigArgs) {
      super(handler, chartEl, chartData, seriesConfigArgs);
      this.seriesConfig = _.defaults(seriesConfigArgs || {}, defaults);
    }

    addCircles(svg, data) {
      const self = this;
      const showCircles = this.seriesConfig.showCircles;
      const color = this.handler.data.getColorFunc();
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.getValueAxis().getScale();
      const ordered = this.handler.data.get('ordered');
      const tooltip = this.baseChart.tooltip;
      const isTooltip = this.seriesConfig.addTooltip;

      const radii = _(data.values)
        .map(function (point) {
          return point.z;
        })
        .reduce(function (result, val) {
          if (result.min > val) result.min = val;
          if (result.max < val) result.max = val;
          return result;
        }, {
          min: Infinity,
          max: -Infinity
        });

      const radiusStep = ((radii.max - radii.min) || (radii.max * 100)) / Math.pow(this.seriesConfig.radiusRatio, 2);

      const layer = svg.append('g')
      .attr('class', 'points line');

      const circles = layer
      .selectAll('circle')
      .data(function appendData() {
        return data.values.filter(function (d) {
          return !_.isNull(d.y);
        });
      });

      circles
      .exit()
      .remove();

      function cx(d) {
        if (ordered && ordered.date) {
          return xScale(d.x);
        }
        return xScale(d.x) + xScale.rangeBand() / 2;
      }

      function cy(d) {
        return yScale(d.y);
      }

      function cColor(d) {
        return color(d.label);
      }

      function colorCircle(d) {
        const parent = d3.select(this).node().parentNode;
        const lengthOfParent = d3.select(parent).data()[0].length;
        const isVisible = (lengthOfParent === 1);

        // If only 1 point exists, show circle
        if (!showCircles && !isVisible) return 'none';
        return cColor(d);
      }

      function getCircleRadiusFn(modifier) {
        return function getCircleRadius(d) {
          const margin = self.handler.visConfig.get('style.margin');
          const width = self.baseChart.chartConfig.width - margin.left - margin.right;
          const height = self.baseChart.chartConfig.height - margin.top - margin.bottom;
          const circleRadius = (d.z - radii.min) / radiusStep;

          return _.min([Math.sqrt((circleRadius || 2) + 2), width, height]) + (modifier || 0);
        };
      }

      circles
      .enter()
      .append('circle')
      .attr('r', getCircleRadiusFn())
      .attr('fill-opacity', (this.seriesConfig.drawLinesBetweenPoints ? 1 : 0.7))
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('class', 'circle-decoration')
      .call(this.baseChart._addIdentifier)
      .attr('fill', colorCircle);

      circles
      .enter()
      .append('circle')
      .attr('r', getCircleRadiusFn(10))
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('fill', 'transparent')
      .attr('class', 'circle')
      .call(this.baseChart._addIdentifier)
      .attr('stroke', cColor)
      .attr('stroke-width', 0);

      if (isTooltip) {
        circles.call(tooltip.render());
      }

      return circles;
    };

    /**
     * Adds path to SVG
     *
     * @method addLines
     * @param svg {HTMLElement} SVG to which path are appended
     * @param data {Array} Array of object data points
     * @returns {D3.UpdateSelection} SVG with paths added
     */
    addLine(svg, data) {
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.getValueAxis().getScale();
      const xAxisFormatter = this.handler.data.get('xAxisFormatter');
      const color = this.handler.data.getColorFunc();
      const ordered = this.handler.data.get('ordered');
      const interpolate = (this.seriesConfig.smoothLines) ? 'cardinal' : this.seriesConfig.interpolate;

      const line = svg.append('g')
        .attr('class', 'pathgroup lines');

      line.append('path')
        .call(this.baseChart._addIdentifier)
        .attr('d', () => {
          const d3Line = d3.svg.line()
            .defined(function (d) {
              return !_.isNull(d.y);
            })
            .interpolate(interpolate)
            .x(function x(d) {
              if (ordered && ordered.date) {
                return xScale(d.x);
              }
              return xScale(d.x) + xScale.rangeBand() / 2;
            })
            .y(function y(d) {
              return yScale(d.y);
            });
          return d3Line(data.values);
        })
        .attr('fill', 'none')
        .attr('stroke', function lineStroke(d) {
          return color(d.label || data.label);
        })
        .attr('stroke-width', 2);

      return line;
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

          if (self.seriesConfig.drawLinesBetweenPoints) {
            self.addLine(svg, self.chartData);
          }
          const circles = self.addCircles(svg, self.chartData);
          self.addCircleEvents(circles);

          self.events.emit('rendered', {
            chart: self.chartData
          });

          return svg;
        });
      };
    };
  }

  return LineChart;
};
