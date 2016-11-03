import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import VislibVisualizationsPointSeriesChartProvider from 'ui/vislib/visualizations/point_series/_point_series_chart';
export default function AreaChartFactory(Private) {

  const PointSeriesChart = Private(VislibVisualizationsPointSeriesChartProvider);

  const defaults = {
    mode: 'normal',
    showCircles: true,
    radiusRatio: 9,
    showLines: true,
    smoothLines: false,
    interpolate: 'linear',
    color: undefined, // todo
    fillColor: undefined, // todo
  };
  /**
   * Area chart visualization
   *
   * @class AreaChart
   * @constructor
   * @extends Chart
   * @param handler {Object} Reference to the Handler Class Constructor
   * @param el {HTMLElement} HTML element to which the chart will be appended
   * @param chartData {Object} Elasticsearch query results for this specific
   * chart
   */
  class AreaChart extends PointSeriesChart {
    constructor(handler, chartEl, chartData, seriesConfigArgs) {
      super(handler, chartEl, chartData);

      this.seriesConfig = _.defaults(seriesConfigArgs || {}, defaults);
      this.isOverlapping = (this.seriesConfig.mode === 'overlap');
      if (this.isOverlapping) {

        // todo ... default opacity handler should check what the opacity is and then move back to it on mouseout
        // Default opacity should return to 0.6 on mouseout
        const defaultOpacity = 0.6;
        this.seriesConfig.defaultOpacity = defaultOpacity;
        handler.highlight = function (element) {
          const label = this.getAttribute('data-label');
          if (!label) return;

          const highlightOpacity = 0.8;
          const highlightElements = $('[data-label]', element.parentNode).filter(
            function (els, el) {
              return `${$(el).data('label')}` === label;
            });
          $('[data-label]', element.parentNode).not(highlightElements).css('opacity', defaultOpacity / 2); // half of the default opacity
          highlightElements.css('opacity', highlightOpacity);
        };
        handler.unHighlight = function (element) {
          $('[data-label]', element).css('opacity', defaultOpacity);

          //The legend should keep max opacity
          $('[data-label]', $(element).siblings()).css('opacity', 1);
        };
      }

      this.checkIfEnoughData();
    }

    /**
     * Adds SVG path to area chart
     *
     * @method addPath
     * @param svg {HTMLElement} SVG to which rect are appended
     * @param layers {Array} Chart data array
     * @returns {D3.UpdateSelection} SVG with path added
     */
    addPath(svg, data) {
      const ordered = this.handler.data.get('ordered');
      const isTimeSeries = (ordered && ordered.date);
      const isOverlapping = this.isOverlapping;
      const color = this.handler.data.getColorFunc();
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.getValueAxis().getScale();
      const interpolate = (this.seriesConfig.smoothLines) ? 'cardinal' : this.seriesConfig.interpolate;

      // Data layers
      const layer = svg.append('g')
      .attr('class', function (d, i) {
        return 'pathgroup ' + i;
      });

      // Append path
      const path = layer.append('path')
      .call(this.baseChart._addIdentifier)
      .style('fill', () => {
        return color(data.label);
      })
      .classed('overlap_area', function () {
        return isOverlapping;
      });

      // update
      path.attr('d', function (d) {
        const area = d3.svg.area()
        .x(function (d) {
          if (isTimeSeries) {
            return xScale(d.x);
          }
          return xScale(d.x) + xScale.rangeBand() / 2;
        })
        .y0(function (d) {
          return yScale(d.y0);
        })
        .y1(function (d) {
          return yScale(d.y0 + d.y);
        })
        .defined(function (d) {
          return !_.isNull(d.y);
        })
        .interpolate(interpolate);
        return area(data.values);
      });

      return path;
    };

    /**
     * Adds SVG circles to area chart
     *
     * @method addCircles
     * @param svg {HTMLElement} SVG to which circles are appended
     * @param data {Array} Chart data array
     * @returns {D3.UpdateSelection} SVG with circles added
     */
    addCircles(svg, data) {
      const color = this.handler.data.getColorFunc();
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.getValueAxis().getScale();
      const ordered = this.handler.data.get('ordered');
      const circleRadius = 12;
      const circleStrokeWidth = 0;
      const tooltip = this.baseChart.tooltip;
      const isTooltip = this.seriesConfig.addTooltip;
      const isOverlapping = this.isOverlapping;

      const layer = svg.append('g')
      .attr('class', 'points area');

      // append the circles
      const circles = layer.selectAll('circles')
      .data(function appendData() {
        return data.values.filter(function isZeroOrNull(d) {
          return d.y !== 0 && !_.isNull(d.y);
        });
      });

      // exit
      circles.exit().remove();

      // enter
      circles
      .enter()
      .append('circle')
      .call(this.baseChart._addIdentifier)
      .attr('stroke', function strokeColor(d) {
        return color(d.label);
      })
      .attr('fill', 'transparent')
      .attr('stroke-width', circleStrokeWidth);

      // update
      circles
      .attr('cx', function cx(d) {
        if (ordered && ordered.date) {
          return xScale(d.x);
        }
        return xScale(d.x) + xScale.rangeBand() / 2;
      })
      .attr('cy', function cy(d) {
        if (isOverlapping) {
          return yScale(d.y);
        }
        return yScale(d.y0 + d.y);
      })
      .attr('r', circleRadius);

      // Add tooltip
      if (isTooltip) {
        circles.call(tooltip.render());
      }

      return circles;
    };

    validateWiggleSelection() {
      const isWiggle = this.seriesConfig.mode === 'wiggle';
      const ordered = this.handler.data.get('ordered');

      if (isWiggle && !ordered) throw new errors.InvalidWiggleSelection();
    };

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the area chart
     */
    draw() {
      const self = this;

      return function (selection) {
        selection.each(function () {
          const svg = self.chartEl.append('g');
          svg.data([self.chartData]);

          self.addPath(svg, self.chartData);
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

  return AreaChart;
};
