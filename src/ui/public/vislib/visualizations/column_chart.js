define(function (require) {
  return function ColumnChartFactory(Private) {
    let d3 = require('d3');
    let _ = require('lodash');
    let $ = require('jquery');
    let moment = require('moment');

    let DataClass = Private(require('ui/vislib/lib/data'));

    let PointSeriesChart = Private(require('ui/vislib/visualizations/_point_series_chart'));
    let TimeMarker = Private(require('ui/vislib/visualizations/time_marker'));
    let errors = require('ui/errors');

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
    _.class(ColumnChart).inherits(PointSeriesChart);
    function ColumnChart(handler, chartEl, chartData) {
      if (!(this instanceof ColumnChart)) {
        return new ColumnChart(handler, chartEl, chartData);
      }

      ColumnChart.Super.apply(this, arguments);

      // Column chart specific attributes
      this._attr = _.defaults(handler._attr || {}, {
        xValue: function (d) { return d.x; },
        yValue: function (d) { return d.y; }
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
    ColumnChart.prototype.addBars = function (svg, layers) {
      let self = this;
      let color = this.handler.data.getColorFunc();
      let tooltip = this.tooltip;
      let isTooltip = this._attr.addTooltip;
      let layer;
      let bars;

      layer = svg.selectAll('.layer')
      .data(layers)
      .enter().append('g')
      .attr('class', function (d, i) {
        return 'series ' + i;
      });

      bars = layer.selectAll('rect')
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
    ColumnChart.prototype.updateBars = function (bars) {
      let offset = this._attr.mode;

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
    ColumnChart.prototype.addStackedBars = function (bars) {
      let data = this.chartData;
      let xScale = this.handler.xAxis.xScale;
      let yScale = this.handler.yAxis.yScale;
      let height = yScale.range()[0];
      let yMin = this.handler.yAxis.yScale.domain()[0];
      let self = this;

      let barWidth;
      if (data.ordered && data.ordered.date) {
        let start = data.ordered.min;
        let end = moment(data.ordered.min).add(data.ordered.interval).valueOf();

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
    ColumnChart.prototype.addGroupedBars = function (bars) {
      let xScale = this.handler.xAxis.xScale;
      let yScale = this.handler.yAxis.yScale;
      let yMin = this.handler.yAxis.yMin;
      let data = this.chartData;
      let n = data.series.length;
      let height = yScale.range()[0];
      let groupSpacingPercentage = 0.15;
      let isTimeScale = (data.ordered && data.ordered.date);
      let minWidth = 1;
      let barWidth;

      // update
      bars
      .attr('x', function (d, i, j) {
        if (isTimeScale) {
          let groupWidth = xScale(data.ordered.min + data.ordered.interval) -
            xScale(data.ordered.min);
          let groupSpacing = groupWidth * groupSpacingPercentage;

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
    ColumnChart.prototype.addBarEvents = function (element, svg) {
      let events = this.events;
      let isBrushable = events.isBrushable();
      let brush = isBrushable ? events.addBrushEvent(svg) : undefined;
      let hover = events.addHoverEvent();
      let mouseout = events.addMouseoutEvent();
      let click = events.addClickEvent();
      let attachedEvents = element.call(hover).call(mouseout).call(click);

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
    ColumnChart.prototype.draw = function () {
      let self = this;
      let $elem = $(this.chartEl);
      let margin = this._attr.margin;
      let elWidth = this._attr.width = $elem.width();
      let elHeight = this._attr.height = $elem.height();
      let yMin = this.handler.yAxis.yMin;
      let yScale = this.handler.yAxis.yScale;
      let xScale = this.handler.xAxis.xScale;
      let minWidth = 20;
      let minHeight = 20;
      let addTimeMarker = this._attr.addTimeMarker;
      let times = this._attr.times || [];
      let timeMarker;
      let div;
      let svg;
      let width;
      let height;
      let layers;
      let bars;

      return function (selection) {
        selection.each(function (data) {
          layers = self.stackData(data);

          width = elWidth;
          height = elHeight - margin.top - margin.bottom;

          if (addTimeMarker) {
            timeMarker = new TimeMarker(times, xScale, height);
          }

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          div = d3.select(this);

          svg = div.append('svg')
          .attr('width', width)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(0,' + margin.top + ')');

          bars = self.addBars(svg, layers);
          self.createEndZones(svg);

          // Adds event listeners
          self.addBarEvents(bars, svg);

          let line = svg.append('line')
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

          return svg;
        });
      };
    };

    return ColumnChart;
  };
});
