import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import VislibVisualizationsPointSeriesChartProvider from 'ui/vislib/visualizations/_point_series_chart';
import VislibVisualizationsTimeMarkerProvider from 'ui/vislib/visualizations/time_marker';
export default function AreaChartFactory(Private) {

  const PointSeriesChart = Private(VislibVisualizationsPointSeriesChartProvider);
  const TimeMarker = Private(VislibVisualizationsTimeMarkerProvider);

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
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);

      this.isOverlapping = (handler._attr.mode === 'overlap');

      if (this.isOverlapping) {

        // Default opacity should return to 0.6 on mouseout
        const defaultOpacity = 0.6;
        handler._attr.defaultOpacity = defaultOpacity;
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
     * Adds SVG path to area chart
     *
     * @method addPath
     * @param svg {HTMLElement} SVG to which rect are appended
     * @param layers {Array} Chart data array
     * @returns {D3.UpdateSelection} SVG with path added
     */
    addPath(svg, layers) {
      const ordered = this.handler.data.get('ordered');
      const isTimeSeries = (ordered && ordered.date);
      const isOverlapping = this.isOverlapping;
      const color = this.handler.data.getColorFunc();
      const xScale = this.handler.xAxis.xScale;
      const yScale = this.handler.yAxis.yScale;
      const interpolate = (this._attr.smoothLines) ? 'cardinal' : this._attr.interpolate;
      const area = d3.svg.area()
      .x(function (d) {
        if (isTimeSeries) {
          return xScale(d.x);
        }
        return xScale(d.x) + xScale.rangeBand() / 2;
      })
      .y0(function (d) {
        if (isOverlapping) {
          return yScale(0);
        }

        return yScale(d.y0);
      })
      .y1(function (d) {
        if (isOverlapping) {
          return yScale(d.y);
        }

        return yScale(d.y0 + d.y);
      })
      .defined(function (d) {
        return !_.isNull(d.y);
      })
      .interpolate(interpolate);

      // Data layers
      const layer = svg.selectAll('.layer')
      .data(layers)
      .enter()
      .append('g')
      .attr('class', function (d, i) {
        return 'pathgroup ' + i;
      });

      // Append path
      const path = layer.append('path')
      .call(this._addIdentifier)
      .style('fill', function (d) {
        return color(d[0].label);
      })
      .classed('overlap_area', function () {
        return isOverlapping;
      });

      // update
      path.attr('d', function (d) {
        return area(d);
      });

      return path;
    };

    /**
     * Adds Events to SVG circles
     *
     * @method addCircleEvents
     * @param element {D3.UpdateSelection} SVG circles
     * @returns {D3.Selection} circles with event listeners attached
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
     * Adds SVG circles to area chart
     *
     * @method addCircles
     * @param svg {HTMLElement} SVG to which circles are appended
     * @param data {Array} Chart data array
     * @returns {D3.UpdateSelection} SVG with circles added
     */
    addCircles(svg, data) {
      const color = this.handler.data.getColorFunc();
      const xScale = this.handler.xAxis.xScale;
      const yScale = this.handler.yAxis.yScale;
      const ordered = this.handler.data.get('ordered');
      const circleRadius = 12;
      const circleStrokeWidth = 0;
      const tooltip = this.tooltip;
      const isTooltip = this._attr.addTooltip;
      const isOverlapping = this.isOverlapping;

      const layer = svg.selectAll('.points')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'points area');

      // append the circles
      const circles = layer
      .selectAll('circles')
      .data(function appendData(data) {
        return data.filter(function isZeroOrNull(d) {
          return d.y !== 0 && !_.isNull(d.y);
        });
      });

      // exit
      circles.exit().remove();

      // enter
      circles
      .enter()
      .append('circle')
      .call(this._addIdentifier)
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

    checkIfEnoughData() {
      const series = this.chartData.series;
      const message = 'Area charts require more than one data point. Try adding ' +
        'an X-Axis Aggregation';

      const notEnoughData = series.some(function (obj) {
        return obj.values.length < 2;
      });

      if (notEnoughData) {
        throw new errors.NotEnoughData(message);
      }
    };

    validateWiggleSelection() {
      const isWiggle = this._attr.mode === 'wiggle';
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
      // Attributes
      const self = this;
      const xScale = this.handler.xAxis.xScale;
      const $elem = $(this.chartEl);
      const margin = this._attr.margin;
      const elWidth = this._attr.width = $elem.width();
      const elHeight = this._attr.height = $elem.height();
      const yMin = this.handler.yAxis.yMin;
      const yScale = this.handler.yAxis.yScale;
      const minWidth = 20;
      const minHeight = 20;
      const addTimeMarker = this._attr.addTimeMarker;
      const times = this._attr.times || [];
      let timeMarker;

      return function (selection) {
        selection.each(function (data) {
          // Stack data
          const layers = self.stackData(data);

          // Get the width and height
          const width = elWidth;
          const height = elHeight - margin.top - margin.bottom;

          if (addTimeMarker) {
            timeMarker = new TimeMarker(times, xScale, height);
          }

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }
          self.validateWiggleSelection();

          // Select the current DOM element
          const div = d3.select(this);

          // Create the canvas for the visualization
          const svg = div.append('svg')
          .attr('width', width)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(0,' + margin.top + ')');

          // add clipPath to hide circles when they go out of bounds
          self.addClipPath(svg, width, height);
          self.createEndZones(svg);

          // add path
          self.addPath(svg, layers);

          if (yMin < 0 && self._attr.mode !== 'wiggle' && self._attr.mode !== 'silhouette') {

            // Draw line at yScale 0 value
            svg.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('y1', yScale(0))
            .attr('x2', width)
            .attr('y2', yScale(0))
            .style('stroke', '#ddd')
            .style('stroke-width', 1);
          }

          // add circles
          const circles = self.addCircles(svg, layers);

          // add click and hover events to circles
          self.addCircleEvents(circles, svg);

          // chart base line
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

  return AreaChart;
};
