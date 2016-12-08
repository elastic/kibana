import _ from 'lodash';
import d3 from 'd3';
import $ from 'jquery';
import moment from 'moment';
import VislibVisualizationsPointSeriesProvider from './_point_series';
import heatmapColorFunc from 'ui/vislib/components/color/heatmap_color';

export default function HeatmapChartFactory(Private) {

  const PointSeries = Private(VislibVisualizationsPointSeriesProvider);

  const defaults = {
    color: undefined, // todo
    fillColor: undefined // todo
  };
  /**
   * Line Chart Visualization
   *
   * @class HeatmapChart
   * @constructor
   * @extends Chart
   * @param handler {Object} Reference to the Handler Class Constructor
   * @param el {HTMLElement} HTML element to which the chart will be appended
   * @param chartData {Object} Elasticsearch query results for this specific chart
   */
  class HeatmapChart extends PointSeries {
    constructor(handler, chartEl, chartData, seriesConfigArgs) {
      super(handler, chartEl, chartData, seriesConfigArgs);
      this.seriesConfig = _.defaults(seriesConfigArgs || {}, defaults);

      this.handler.visConfig.set('legend', {
        labels: this.getHeatmapLabels(this.handler.visConfig),
        colors: this.getHeatmapColors(this.handler.visConfig)
      });

      const colors = this.handler.visConfig.get('legend.colors', null);
      if (colors) {
        this.handler.vis.uiState.setSilent('vis.defaultColors', null);
        this.handler.vis.uiState.setSilent('vis.defaultColors', colors);
      }
    }

    getHeatmapLabels(cfg) {
      const percentageMode = cfg.get('percentageMode');
      const colorsNumber = cfg.get('colorsNumber');
      const colorsRange = cfg.get('colorsRange');
      const zScale = this.getValueAxis().getScale();
      const [min, max] = zScale.domain();
      const labels = [];
      for (let i = 0; i < colorsNumber; i++) {
        let label;

        if (cfg.get('setColorRange')) {
          const greaterThan = colorsRange[i].value;
          label = `> ${greaterThan}`;
        } else {
          let val = i / colorsNumber;
          let nextVal = (i + 1) / colorsNumber;
          if (percentageMode) {
            val = Math.ceil(val * 100);
            nextVal = Math.ceil(nextVal * 100);
            label = `${val}% - ${nextVal}%`;
          } else {
            val = val * (max - min) + min;
            nextVal = nextVal * (max - min) + min;
            if (max > 1) {
              val = Math.ceil(val);
              nextVal = Math.ceil(nextVal);
            }
            label = `${val} - ${nextVal}`;
          }
        }
        labels.push(label);
      }
      return labels;
    };

    getHeatmapColors(cfg) {
      const colorsNumber = cfg.get('colorsNumber');
      const invertColors = cfg.get('invertColors');
      const colorSchema = cfg.get('colorSchema');
      const labels = this.getHeatmapLabels(cfg);
      const colors = {};
      for (let i in labels) {
        if (labels[i]) {
          const val = invertColors ? 1 - i / colorsNumber : i / colorsNumber;
          colors[labels[i]] = heatmapColorFunc(val, colorSchema);
        }
      }
      return colors;
    };

    addSquares(svg, data) {
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.handler.valueAxes[1].getScale();
      const zScale = this.getValueAxis().getScale();
      const ordered = this.handler.data.get('ordered');
      const tooltip = this.baseChart.tooltip;
      const isTooltip = this.handler.visConfig.get('tooltip.show');
      const isHorizontal = this.getCategoryAxis().axisConfig.isHorizontal();
      const colorsNumber = this.handler.visConfig.get('colorsNumber');
      const setColorRange = this.handler.visConfig.get('setColorRange');
      const colorsRange = this.handler.visConfig.get('colorsRange');
      const color = this.handler.data.getColorFunc();
      const labels = this.handler.visConfig.get('legend.labels');
      const zAxisConfig = this.getValueAxis().axisConfig;
      const zAxisFormatter = zAxisConfig.get('labels.axisFormatter');
      const showLabels = zAxisConfig.get('labels.show');

      const layer = svg.append('g')
        .attr('class', 'series');

      const squares = layer
        .selectAll('g.square')
        .data(data.values);

      squares
        .exit()
        .remove();

      let barWidth;
      if (this.getCategoryAxis().axisConfig.isTimeDomain()) {
        const { min, interval } = this.handler.data.get('ordered');
        const start = min;
        const end = moment(min).add(interval).valueOf();

        barWidth = xScale(end) - xScale(start);
        if (!isHorizontal) barWidth *= -1;
      }

      function x(d) {
        return xScale(d.x);
      }

      function y(d) {
        return yScale(d.series);
      }

      const [min, max] = zScale.domain();
      function getColorBucket(d) {
        let val = 0;
        if (setColorRange && colorsRange.length) {
          if (d.y < colorsRange[0].value) return -1;
          while (val + 1 < colorsRange.length && d.y > colorsRange[val + 1].value) val++;
        } else {
          if (isNaN(min) || isNaN(max)) {
            val = colorsNumber - 1;
          } else {
            val = (d.y - min) / (max - min); /* get val from 0 - 1 */
            val = Math.floor(val * (colorsNumber - 1));
          }
        }
        return val;
      }

      function label(d) {
        const colorBucket = getColorBucket(d);
        return labels[colorBucket];
      }

      function z(d) {
        if (label(d) === '') return 'transparent';
        return color(label(d));
      }

      function truncateLabel(text, size) {
        const node = d3.select(text).node();
        let str = $(node).text();
        const width = node.getBBox().width;
        const chars = str.length;
        const pxPerChar = width / chars;
        let endChar = 0;
        const ellipsesPad = 4;


        if (width > size) {
          endChar = Math.floor((size / pxPerChar) - ellipsesPad);
          while (str[endChar - 1] === ' ' || str[endChar - 1] === '-' || str[endChar - 1] === ',') {
            endChar = endChar - 1;
          }
          str = str.substr(0, endChar) + '...';
        }
        return str;
      };

      const squareWidth = barWidth || xScale.rangeBand();
      const squareHeight = yScale.rangeBand();

      squares
        .enter()
        .append('g')
        .attr('class', 'square');

      squares.append('rect')
        .attr('x', x)
        .attr('width', squareWidth)
        .attr('y', y)
        .attr('height', squareHeight)
        .attr('data-label', label)
        .attr('fill', z)
        .attr('style', 'cursor: pointer; stroke: black; stroke-width: 0.3px');

      // todo: verify that longest label is not longer than the barwidth
      // or barwidth is not smaller than textheight (and vice versa)
      //
      if (showLabels) {
        const rotate = zAxisConfig.get('labels.rotate');
        const rotateRad = rotate * Math.PI / 180;
        const truncate = Math.min(
          Math.abs(squareWidth / Math.cos(rotateRad)),
          Math.abs(squareHeight / Math.sin(rotateRad))
        ) - 10;

        squares.append('text')
          .text(d => zAxisFormatter(d.y))
          .text(function () {
            return truncateLabel(this, truncate);
          })
          .style('dominant-baseline', 'central')
          .style('text-anchor', 'middle')
          .attr('x', function (d) {
            const center = x(d) + squareWidth / 2;
            return center;
          })
          .attr('y', function (d) {
            const center = y(d) + squareHeight / 2;
            return center;
          })
          .attr('transform', function (d) {
            const horizontalCenter = x(d) + squareWidth / 2;
            const verticalCenter = y(d) + squareHeight / 2;
            return `rotate(${rotate},${horizontalCenter},${verticalCenter})`;
          });
      }

      if (isTooltip) {
        squares.call(tooltip.render());
      }

      return squares;
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

          const squares = self.addSquares(svg, self.chartData);
          self.addCircleEvents(squares);

          self.events.emit('rendered', {
            chart: self.chartData
          });

          return svg;
        });
      };
    };
  }

  return HeatmapChart;
};
