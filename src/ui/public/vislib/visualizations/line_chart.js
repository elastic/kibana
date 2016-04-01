define(function (require) {
  return function LineChartFactory(Private) {
    let d3 = require('d3');
    let _ = require('lodash');
    let $ = require('jquery');
    let errors = require('ui/errors');

    let PointSeriesChart = Private(require('ui/vislib/visualizations/_point_series_chart'));
    let TimeMarker = Private(require('ui/vislib/visualizations/time_marker'));

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
    _.class(LineChart).inherits(PointSeriesChart);
    function LineChart(handler, chartEl, chartData) {
      if (!(this instanceof LineChart)) {
        return new LineChart(handler, chartEl, chartData);
      }

      LineChart.Super.apply(this, arguments);

      // Line chart specific attributes
      this._attr = _.defaults(handler._attr || {}, {
        interpolate: 'linear',
        xValue: function (d) { return d.x; },
        yValue: function (d) { return d.y; }
      });
    }

    /**
     * Adds Events to SVG circle
     *
     * @method addCircleEvents
     * @param element{D3.UpdateSelection} Reference to SVG circle
     * @returns {D3.Selection} SVG circles with event listeners attached
     */
    LineChart.prototype.addCircleEvents = function (element, svg) {
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
     * Adds circles to SVG
     *
     * @method addCircles
     * @param svg {HTMLElement} SVG to which rect are appended
     * @param data {Array} Array of object data points
     * @returns {D3.UpdateSelection} SVG with circles added
     */
    LineChart.prototype.addCircles = function (svg, data) {
      let self = this;
      let showCircles = this._attr.showCircles;
      let color = this.handler.data.getColorFunc();
      let xScale = this.handler.xAxis.xScale;
      let yScale = this.handler.yAxis.yScale;
      let ordered = this.handler.data.get('ordered');
      let tooltip = this.tooltip;
      let isTooltip = this._attr.addTooltip;

      let radii = _(data)
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

      let radiusStep = ((radii.max - radii.min) || (radii.max * 100)) / Math.pow(this._attr.radiusRatio, 2);

      let layer = svg.selectAll('.points')
      .data(data)
      .enter()
        .append('g')
        .attr('class', 'points line');

      let circles = layer
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
        let parent = d3.select(this).node().parentNode;
        let lengthOfParent = d3.select(parent).data()[0].length;
        let isVisible = (lengthOfParent === 1);

        // If only 1 point exists, show circle
        if (!showCircles && !isVisible) return 'none';
        return cColor(d);
      }
      function getCircleRadiusFn(modifier) {
        return function getCircleRadius(d) {
          let margin = self._attr.margin;
          let width = self._attr.width - margin.left - margin.right;
          let height = self._attr.height - margin.top - margin.bottom;
          let circleRadius = (d._input.z - radii.min) / radiusStep;

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
    LineChart.prototype.addLines = function (svg, data) {
      let self = this;
      let xScale = this.handler.xAxis.xScale;
      let yScale = this.handler.yAxis.yScale;
      let xAxisFormatter = this.handler.data.get('xAxisFormatter');
      let color = this.handler.data.getColorFunc();
      let ordered = this.handler.data.get('ordered');
      let interpolate = (this._attr.smoothLines) ? 'cardinal' : this._attr.interpolate;
      let line = d3.svg.line()
      .defined(function (d) { return !_.isNull(d.y); })
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
      let lines;

      lines = svg
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
    LineChart.prototype.addClipPath = function (svg, width, height) {
      let clipPathBuffer = 5;
      let startX = 0;
      let startY = 0 - clipPathBuffer;
      let id = 'chart-area' + _.uniqueId();

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
    LineChart.prototype.draw = function () {
      let self = this;
      let $elem = $(this.chartEl);
      let margin = this._attr.margin;
      let elWidth = this._attr.width = $elem.width();
      let elHeight = this._attr.height = $elem.height();
      let scaleType = this.handler.yAxis.getScaleType();
      let yMin = this.handler.yAxis.yMin;
      let yScale = this.handler.yAxis.yScale;
      let xScale = this.handler.xAxis.xScale;
      let minWidth = 20;
      let minHeight = 20;
      let startLineX = 0;
      let lineStrokeWidth = 1;
      let addTimeMarker = this._attr.addTimeMarker;
      let times = this._attr.times || [];
      let timeMarker;
      let div;
      let svg;
      let width;
      let height;
      let lines;
      let circles;

      return function (selection) {
        selection.each(function (data) {
          let el = this;

          let layers = data.series.map(function mapSeries(d) {
            let label = d.label;
            return d.values.map(function mapValues(e, i) {
              return {
                _input: e,
                label: label,
                x: self._attr.xValue.call(d.values, e, i),
                y: self._attr.yValue.call(d.values, e, i)
              };
            });
          });

          width = elWidth - margin.left - margin.right;
          height = elHeight - margin.top - margin.bottom;

          if (addTimeMarker) {
            timeMarker = new TimeMarker(times, xScale, height);
          }

          if (self._attr.scale === 'log' && self._invalidLogScaleValues(data)) {
            throw new errors.InvalidLogScaleValues();
          }

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          div = d3.select(el);

          svg = div.append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          self.addClipPath(svg, width, height);
          if (self._attr.drawLinesBetweenPoints) {
            lines = self.addLines(svg, data.series);
          }
          circles = self.addCircles(svg, layers);
          self.addCircleEvents(circles, svg);
          self.createEndZones(svg);

          let scale = (scaleType === 'log') ? yScale(1) : yScale(0);
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

          return svg;
        });
      };
    };

    return LineChart;
  };
});
