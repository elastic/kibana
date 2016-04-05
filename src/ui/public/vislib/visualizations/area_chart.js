import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import VislibVisualizationsPointSeriesChartProvider from 'ui/vislib/visualizations/_point_series_chart';
import VislibVisualizationsTimeMarkerProvider from 'ui/vislib/visualizations/time_marker';
export default function AreaChartFactory(Private) {

  var PointSeriesChart = Private(VislibVisualizationsPointSeriesChartProvider);
  var TimeMarker = Private(VislibVisualizationsTimeMarkerProvider);

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
  _.class(AreaChart).inherits(PointSeriesChart);
  function AreaChart(handler, chartEl, chartData) {
    if (!(this instanceof AreaChart)) {
      return new AreaChart(handler, chartEl, chartData);
    }

    AreaChart.Super.apply(this, arguments);

    this.isOverlapping = (handler._attr.mode === 'overlap');

    if (this.isOverlapping) {

      // Default opacity should return to 0.6 on mouseout
      var defaultOpacity = 0.6;
      handler._attr.defaultOpacity = defaultOpacity;
      handler.highlight = function (element) {
        var label = this.getAttribute('data-label');
        if (!label) return;

        var highlightOpacity = 0.8;
        var highlightElements = $('[data-label]', element.parentNode).filter(
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
      xValue: function (d) { return d.x; },
      yValue: function (d) { return d.y; }
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
  AreaChart.prototype.addPath = function (svg, layers) {
    var self = this;
    var ordered = this.handler.data.get('ordered');
    var isTimeSeries = (ordered && ordered.date);
    var isOverlapping = this.isOverlapping;
    var color = this.handler.data.getColorFunc();
    var xScale = this.handler.xAxis.xScale;
    var yScale = this.handler.yAxis.yScale;
    var interpolate = (this._attr.smoothLines) ? 'cardinal' : this._attr.interpolate;
    var area = d3.svg.area()
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
    .defined(function (d) { return !_.isNull(d.y); })
    .interpolate(interpolate);

    // Data layers
    var layer = svg.selectAll('.layer')
    .data(layers)
    .enter()
    .append('g')
    .attr('class', function (d, i) {
      return 'pathgroup ' + i;
    });

    // Append path
    var path = layer.append('path')
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
  AreaChart.prototype.addCircleEvents = function (element, svg) {
    var events = this.events;
    var isBrushable = events.isBrushable();
    var brush = isBrushable ? events.addBrushEvent(svg) : undefined;
    var hover = events.addHoverEvent();
    var mouseout = events.addMouseoutEvent();
    var click = events.addClickEvent();
    var attachedEvents = element.call(hover).call(mouseout).call(click);

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
  AreaChart.prototype.addCircles = function (svg, data) {
    var self = this;
    var color = this.handler.data.getColorFunc();
    var xScale = this.handler.xAxis.xScale;
    var yScale = this.handler.yAxis.yScale;
    var ordered = this.handler.data.get('ordered');
    var circleRadius = 12;
    var circleStrokeWidth = 0;
    var tooltip = this.tooltip;
    var isTooltip = this._attr.addTooltip;
    var isOverlapping = this.isOverlapping;
    let layer;
    let circles;

    layer = svg.selectAll('.points')
    .data(data)
    .enter()
      .append('g')
      .attr('class', 'points area');

    // append the circles
    circles = layer
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
  AreaChart.prototype.addClipPath = function (svg, width, height) {
    // Prevents circles from being clipped at the top of the chart
    var startX = 0;
    var startY = 0;
    var id = 'chart-area' + _.uniqueId();

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

  AreaChart.prototype.checkIfEnoughData = function () {
    var series = this.chartData.series;
    var message = 'Area charts require more than one data point. Try adding ' +
      'an X-Axis Aggregation';

    var notEnoughData = series.some(function (obj) {
      return obj.values.length < 2;
    });

    if (notEnoughData) {
      throw new errors.NotEnoughData(message);
    }
  };

  AreaChart.prototype.validateWiggleSelection = function () {
    var isWiggle = this._attr.mode === 'wiggle';
    var ordered = this.handler.data.get('ordered');

    if (isWiggle && !ordered) throw new errors.InvalidWiggleSelection();
  };

  /**
   * Renders d3 visualization
   *
   * @method draw
   * @returns {Function} Creates the area chart
   */
  AreaChart.prototype.draw = function () {
    // Attributes
    var self = this;
    var xScale = this.handler.xAxis.xScale;
    var $elem = $(this.chartEl);
    var margin = this._attr.margin;
    var elWidth = this._attr.width = $elem.width();
    var elHeight = this._attr.height = $elem.height();
    var yMin = this.handler.yAxis.yMin;
    var yScale = this.handler.yAxis.yScale;
    var minWidth = 20;
    var minHeight = 20;
    var addTimeMarker = this._attr.addTimeMarker;
    var times = this._attr.times || [];
    let timeMarker;
    let div;
    let svg;
    let width;
    let height;
    let layers;
    let circles;
    let path;

    return function (selection) {
      selection.each(function (data) {
        // Stack data
        layers = self.stackData(data);

        // Get the width and height
        width = elWidth;
        height = elHeight - margin.top - margin.bottom;

        if (addTimeMarker) {
          timeMarker = new TimeMarker(times, xScale, height);
        }

        if (width < minWidth || height < minHeight) {
          throw new errors.ContainerTooSmall();
        }
        self.validateWiggleSelection();

        // Select the current DOM element
        div = d3.select(this);

        // Create the canvas for the visualization
        svg = div.append('svg')
        .attr('width', width)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(0,' + margin.top + ')');

        // add clipPath to hide circles when they go out of bounds
        self.addClipPath(svg, width, height);
        self.createEndZones(svg);

        // add path
        path = self.addPath(svg, layers);

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
        circles = self.addCircles(svg, layers);

        // add click and hover events to circles
        self.addCircleEvents(circles, svg);

        // chart base line
        var line = svg.append('line')
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

  return AreaChart;
};
