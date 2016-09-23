import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import VislibVisualizationsPointSeriesChartProvider from 'ui/vislib/visualizations/_point_series_chart';
import VislibVisualizationsTimeMarkerProvider from 'ui/vislib/visualizations/time_marker';
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
    constructor(handler, chartEl, chartData, chartConfig) {
      super(handler, chartEl, chartData);

      this.isOverlapping = (handler._attr.mode === 'overlap');

      if (this.isOverlapping) {

        // todo ... default opacity handler should check what the opacity is and then move back to it on mouseout
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

      this._attr = _.defaults(chartConfig || {}, defaults);
    }

    /**
     * Adds SVG path to area chart
     *
     * @method addPath
     * @param svg {HTMLElement} SVG to which rect are appended
     * @param layers {Array} Chart data array
     * @returns {D3.UpdateSelection} SVG with path added
     */
    addPath(svg, data, label) {
      const ordered = this.handler.data.get('ordered');
      const isTimeSeries = (ordered && ordered.date);
      const isOverlapping = this.isOverlapping;
      const color = this.handler.data.getColorFunc();
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.getValueAxis().getScale();
      const interpolate = (this._attr.smoothLines) ? 'cardinal' : this._attr.interpolate;

      // Data layers
      const layer = svg.append('g')
      .attr('class', function (d, i) {
        return 'pathgroup ' + i;
      });

      // Append path
      const path = layer.append('path')
      .call(this._addIdentifier)
      .style('fill', () => {
        return color(label);
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
        return area(data);
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
      const tooltip = this.tooltip;
      const isTooltip = this._attr.addTooltip;
      const isOverlapping = this.isOverlapping;

      const layer = svg.append('g')
      .attr('class', 'points area');

      // append the circles
      const circles = layer.selectAll('circles')
      .data(function appendData() {
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
      const self = this;

      return function (selection) {
        selection.each(function () {
          const data = self.handler.pointSeries.mapData(self.chartData, self);
          const svg = self.chartEl.append('g');
          svg.data([self.chartData]);

          self.addPath(svg, data, self.chartData.label);
          const circles = self.addCircles(svg, data);
          self.addCircleEvents(circles);

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
