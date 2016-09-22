import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import errors from 'ui/errors';
import VislibVisualizationsPointSeriesChartProvider from 'ui/vislib/visualizations/_point_series_chart';
import VislibVisualizationsTimeMarkerProvider from 'ui/vislib/visualizations/time_marker';
export default function ColumnChartFactory(Private) {

  const PointSeriesChart = Private(VislibVisualizationsPointSeriesChartProvider);
  const TimeMarker = Private(VislibVisualizationsTimeMarkerProvider);

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
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);

      // Column chart specific attributes
      this._attr = _.defaults(handler._attr || {}, {
        xValue: function (d) {
          return d.x;
        },
        yValue: function (d) {
          return d.y;
        }
      });
    }

    /**
     * Adds SVG rect to Vertical Bar Chart
     *
     * @method addBars
     * @param svg {HTMLElement} SVG to which rect are appended
     * @param layers {Array} Chart data array
     * @returns {D3.UpdateSelection} SVG with rect added
     */
    addBars(svg, layers) {
      const self = this;
      const color = this.handler.data.getColorFunc();
      const tooltip = this.tooltip;
      const isTooltip = this._attr.addTooltip;

      const layer = svg.selectAll('.layer')
        .data(layers)
        .enter().append('g')
        .attr('class', function (d, i) {
          return 'series ' + i;
        });

      const bars = layer.selectAll('rect')
        .data(function (d) {
          return d;
        });

      bars
        .exit()
        .remove();

      bars
        .enter()
        .append('rect')
        .call(this._addIdentifier)
        .attr('fill', function (d) {
          return color(d.label);
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
      const offset = this._attr.mode;

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
      const data = this.chartData;
      const xScale = this.handler.xAxis.xScale;
      const yScale = this.handler.yAxis.yScale;
      const height = yScale.range()[0];
      const yMin = this.handler.yAxis.yScale.domain()[0];

      let barWidth;
      if (data.ordered && data.ordered.date) {
        const start = data.ordered.min;
        const end = moment(data.ordered.min).add(data.ordered.interval).valueOf();

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
          if (d.y < 0) {
            return yScale(d.y0);
          }

          return yScale(d.y0 + d.y);
        })
        .attr('height', function (d) {
          if (d.y < 0) {
            return Math.abs(yScale(d.y0 + d.y) - yScale(d.y0));
          }

          // Due to an issue with D3 not returning zeros correctly when using
          // an offset='expand', need to add conditional statement to handle zeros
          // appropriately
          if (d._input.y === 0) {
            return 0;
          }

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
      const xScale = this.handler.xAxis.xScale;
      const yScale = this.handler.yAxis.yScale;
      const data = this.chartData;
      const n = data.series.length;
      const height = yScale.range()[0];
      const groupSpacingPercentage = 0.15;
      const isTimeScale = (data.ordered && data.ordered.date);
      const minWidth = 1;
      let barWidth;

      // update
      bars
        .attr('x', function (d, i, j) {
          if (isTimeScale) {
            const groupWidth = xScale(data.ordered.min + data.ordered.interval) -
              xScale(data.ordered.min);
            const groupSpacing = groupWidth * groupSpacingPercentage;

            barWidth = (groupWidth - groupSpacing) / n;

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
     * Adds Events to SVG rect
     * Visualization is only brushable when a brush event is added
     * If a brush event is added, then a function should be returned.
     *
     * @method addBarEvents
     * @param element {D3.UpdateSelection} target
     * @param svg {D3.UpdateSelection} chart SVG
     * @returns {D3.Selection} rect with event listeners attached
     */
    addBarEvents(element, svg) {
      const events = this.events;
      const isBrushable = events.isBrushable();
      const brush = isBrushable ? events.addBrushEvent(svg) : undefined;
      const hover = events.addHoverEvent();
      const mouseout = events.addMouseoutEvent();
      const click = events.addClickEvent();
      const attachedEvents = element.call(hover).call(mouseout).call(click);

      if (isBrushable) {
        attachedEvents.call(brush);
      }

      return attachedEvents;
    };

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the vertical bar chart
     */
    draw() {
      const self = this;
      const $elem = $(this.chartEl);
      const margin = this._attr.margin;
      const elWidth = this._attr.width = $elem.width();
      const elHeight = this._attr.height = $elem.height();
      const yScale = this.handler.yAxis.yScale;
      const xScale = this.handler.xAxis.xScale;
      const minWidth = 20;
      const minHeight = 20;
      const addTimeMarker = this._attr.addTimeMarker;
      const times = this._attr.times || [];
      let timeMarker;

      return function (selection) {
        selection.each(function (data) {
          const layers = self.stackData(data);

          const width = elWidth;
          const height = elHeight - margin.top - margin.bottom;
          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }
          self.validateDataCompliesWithScalingMethod(data);

          if (addTimeMarker) {
            timeMarker = new TimeMarker(times, xScale, height);
          }

          if (
            data.series.length > 1 &&
            (self._attr.scale === 'log' || self._attr.scale === 'square root') &&
            (self._attr.mode === 'stacked' || self._attr.mode === 'percentage')
          ) {
            throw new errors.StackedBarChartConfig(`Cannot display ${self._attr.mode} bar charts for multiple data series \
          with a ${self._attr.scale} scaling method. Try 'linear' scaling instead.`);
          }

          const div = d3.select(this);

          const svg = div.append('svg')
          .attr('width', width)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(0,' + margin.top + ')');

          const bars = self.addBars(svg, layers);
          self.createEndZones(svg);

          // Adds event listeners
          self.addBarEvents(bars, svg);

          svg.append('line')
          .attr('class', 'base-line')
          .attr('x1', 0)
          .attr('y1', yScale(0))
          .attr('x2', width)
          .attr('y2', yScale(0))
          .style('stroke', '#ddd')
          .style('stroke-width', 1);

          if (addTimeMarker) {
            timeMarker.render(svg);
          }

          self.events.emit('rendered', {
            chart: data
          });

          return svg;
        });
      };
    };
  }

  return ColumnChart;
};
