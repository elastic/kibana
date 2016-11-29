import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import VislibVisualizationsPointSeriesChartProvider from 'ui/vislib/visualizations/_point_series_chart';
import VislibVisualizationsTimeMarkerProvider from 'ui/vislib/visualizations/time_marker';
export default function LineChartFactory(Private) {

  const PointSeriesChart = Private(VislibVisualizationsPointSeriesChartProvider);
  const TimeMarker = Private(VislibVisualizationsTimeMarkerProvider);

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
  class LineChart extends PointSeriesChart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);

      // Line chart specific attributes
      this._attr = _.defaults(handler._attr || {}, {
        interpolate: 'linear',
        xValue: function (d) {
          return d.x;
        },
        yValue: function (d) {
          return d.y;
        }
      });
    }

    /**
     * Adds Events to SVG circle
     *
     * @method addCircleEvents
     * @param element{D3.UpdateSelection} Reference to SVG circle
     * @returns {D3.Selection} SVG circles with event listeners attached
     */
    addCircleEvents(element, svg) {
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
     * Adds circles to SVG
     *
     * @method addCircles
     * @param svg {HTMLElement} SVG to which rect are appended
     * @param data {Array} Array of object data points
     * @returns {D3.UpdateSelection} SVG with circles added
     */
    addCircles(svg, data) {
      const self = this;
      const showCircles = this._attr.showCircles;
      const color = this.handler.data.getColorFunc();
      const xScale = this.handler.xAxis.xScale;
      const yScale = this.handler.yAxis.yScale;
      const ordered = this.handler.data.get('ordered');
      const tooltip = this.tooltip;
      const isTooltip = this._attr.addTooltip;

      const radii = _(data)
      .map(function (series) {
        return _.pluck(series, '_input.z');
      })
      .flattenDeep()
      .reduce(function (result, val) {
        if (result.min > val) result.min = val;
        if (result.max < val) result.max = val;
        return result;
      }, {
        min: Infinity,
        max: -Infinity
      });

      const radiusStep = ((radii.max - radii.min) || (radii.max * 100)) / Math.pow(this._attr.radiusRatio, 2);

      const layer = svg.selectAll('.points')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'points line');

      const circles = layer
      .selectAll('circle')
      .data(function appendData(data) {
        return data.filter(function (d) {
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
          const margin = self._attr.margin;
          const width = self._attr.width - margin.left - margin.right;
          const height = self._attr.height - margin.top - margin.bottom;
          const circleRadius = (d._input.z - radii.min) / radiusStep;

          return _.min([Math.sqrt((circleRadius || 2) + 2), width, height]) + (modifier || 0);
        };
      }


      circles
      .enter()
      .append('circle')
      .attr('r', getCircleRadiusFn())
      .attr('fill-opacity', (this._attr.drawLinesBetweenPoints ? 1 : 0.7))
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('class', 'circle-decoration')
      .call(this._addIdentifier)
      .attr('fill', colorCircle);

      circles
      .enter()
      .append('circle')
      .attr('r', getCircleRadiusFn(10))
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('fill', 'transparent')
      .attr('class', 'circle')
      .call(this._addIdentifier)
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
    addLines(svg, data) {
      const xScale = this.handler.xAxis.xScale;
      const yScale = this.handler.yAxis.yScale;
      const xAxisFormatter = this.handler.data.get('xAxisFormatter');
      const color = this.handler.data.getColorFunc();
      const ordered = this.handler.data.get('ordered');
      const interpolate = (this._attr.smoothLines) ? 'cardinal' : this._attr.interpolate;
      const line = d3.svg.line()
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

      const lines = svg
        .selectAll('.lines')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'pathgroup lines');

      lines.append('path')
        .call(this._addIdentifier)
        .attr('d', function lineD(d) {
          return line(d.values);
        })
        .attr('fill', 'none')
        .attr('stroke', function lineStroke(d) {
          return color(d.label);
        })
        .attr('stroke-width', 2);

      return lines;
    };

    /**
     * Adds SVG clipPath
     *
     * @method addClipPath
     * @param svg {HTMLElement} SVG to which clipPath is appended
     * @param width {Number} SVG width
     * @param height {Number} SVG height
     * @returns {D3.UpdateSelection} SVG with clipPath added
     */
    addClipPath(svg, width, height) {
      const clipPathBuffer = 5;
      const startX = 0;
      const startY = 0 - clipPathBuffer;
      const id = 'chart-area' + _.uniqueId();

      return svg
      .attr('clip-path', 'url(#' + id + ')')
      .append('clipPath')
      .attr('id', id)
      .append('rect')
      .attr('x', startX)
      .attr('y', startY)
      .attr('width', width)
      // Adding clipPathBuffer to height so it doesn't
      // cutoff the lower part of the chart
      .attr('height', height + clipPathBuffer);
    };

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the line chart
     */
    draw() {
      const self = this;
      const $elem = $(this.chartEl);
      const margin = this._attr.margin;
      const elWidth = this._attr.width = $elem.width();
      const elHeight = this._attr.height = $elem.height();
      const scaleType = this.handler.yAxis.getScaleType();
      const yScale = this.handler.yAxis.yScale;
      const xScale = this.handler.xAxis.xScale;
      const minWidth = 20;
      const minHeight = 20;
      const startLineX = 0;
      const lineStrokeWidth = 1;
      const addTimeMarker = this._attr.addTimeMarker;
      const times = this._attr.times || [];
      let timeMarker;

      return function (selection) {
        selection.each(function (data) {
          const el = this;

          const layers = data.series.map(function mapSeries(d) {
            const label = d.label;
            return d.values.map(function mapValues(e, i) {
              return {
                _input: e,
                label: label,
                x: self._attr.xValue.call(d.values, e, i),
                y: self._attr.yValue.call(d.values, e, i)
              };
            });
          });

          const width = elWidth - margin.left - margin.right;
          const height = elHeight - margin.top - margin.bottom;
          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }
          self.validateDataCompliesWithScalingMethod(data);

          if (addTimeMarker) {
            timeMarker = new TimeMarker(times, xScale, height);
          }


          const div = d3.select(el);

          const svg = div.append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          self.addClipPath(svg, width, height);
          if (self._attr.drawLinesBetweenPoints) {
            self.addLines(svg, data.series);
          }
          const circles = self.addCircles(svg, layers);
          self.addCircleEvents(circles, svg);
          self.createEndZones(svg);

          const scale = (scaleType === 'log') ? yScale(1) : yScale(0);
          if (scale) {
            svg.append('line')
            .attr('class', 'base-line')
            .attr('x1', startLineX)
            .attr('y1', scale)
            .attr('x2', width)
            .attr('y2', scale)
            .style('stroke', '#ddd')
            .style('stroke-width', lineStrokeWidth);
          }

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

  return LineChart;
};
