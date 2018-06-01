/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { VislibVisualizationsPointSeriesProvider } from './_point_series';

export function VislibVisualizationsColumnChartProvider(Private) {

  const PointSeries = Private(VislibVisualizationsPointSeriesProvider);

  const defaults = {
    mode: 'normal',
    showTooltip: true,
    color: undefined,
    fillColor: undefined,
  };

  /**
   * Histogram intervals are not always equal widths, e.g, monthly time intervals.
   * It is more visually appealing to vary bar width so that gutter width is constant.
   */
  function datumWidth(defaultWidth, datum, nextDatum, scale, gutterWidth, groupCount = 1) {
    let datumWidth = defaultWidth;
    if (nextDatum) {
      datumWidth = ((scale(nextDatum.x) - scale(datum.x)) - gutterWidth) / groupCount;
      // To handle data-sets with holes, do not let width be larger than default.
      if (datumWidth > defaultWidth) {
        datumWidth = defaultWidth;
      }
    }
    return datumWidth;
  }

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
  class ColumnChart extends PointSeries {
    constructor(handler, chartEl, chartData, seriesConfigArgs) {
      super(handler, chartEl, chartData, seriesConfigArgs);
      this.seriesConfig = _.defaults(seriesConfigArgs || {}, defaults);
    }

    addBars(svg, data) {
      const self = this;
      const color = this.handler.data.getColorFunc();
      const tooltip = this.baseChart.tooltip;
      const isTooltip = this.handler.visConfig.get('tooltip.show');

      const layer = svg.append('g')
        .attr('class', 'series histogram')
        .attr('clip-path', 'url(#' + this.baseChart.clipPathId + ')');

      const bars = layer.selectAll('rect')
        .data(data.values.filter(function (d) {
          return !_.isNull(d.y);
        }));

      bars
        .exit()
        .remove();

      bars
        .enter()
        .append('rect')
        .attr('data-label', data.label)
        .attr('fill', () => color(data.label))
        .attr('stroke', () => color(data.label));

      self.updateBars(bars);

      // Add tooltip
      if (isTooltip) {
        bars.call(tooltip.render());
      }

      return bars;
    }

    /**
     * Determines whether bars are grouped or stacked and updates the D3
     * selection
     *
     * @method updateBars
     * @param bars {D3.UpdateSelection} SVG with rect added
     * @returns {D3.UpdateSelection}
     */
    updateBars(bars) {
      if (this.seriesConfig.mode === 'stacked') {
        return this.addStackedBars(bars);
      }
      return this.addGroupedBars(bars);

    }

    /**
     * Adds stacked bars to column chart visualization
     *
     * @method addStackedBars
     * @param bars {D3.UpdateSelection} SVG with rect added
     * @returns {D3.UpdateSelection}
     */
    addStackedBars(bars) {
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.getValueAxis().getScale();
      const isHorizontal = this.getCategoryAxis().axisConfig.isHorizontal();
      const isTimeScale = this.getCategoryAxis().axisConfig.isTimeDomain();
      const yMin = yScale.domain()[0];
      const gutterSpacingPercentage = 0.15;
      const groupCount = this.getGroupedCount();
      const groupNum = this.getGroupedNum(this.chartData);
      let barWidth;
      let gutterWidth;

      if (isTimeScale) {
        const { min, interval } = this.handler.data.get('ordered');
        let intervalWidth = xScale(min + interval) - xScale(min);
        intervalWidth = Math.abs(intervalWidth);

        gutterWidth = intervalWidth * gutterSpacingPercentage;
        barWidth = (intervalWidth - gutterWidth) / groupCount;
      }

      function x(d, i) {
        if (isTimeScale) {
          return xScale(d.x) + datumWidth(barWidth, d, bars.data()[i + 1], xScale, gutterWidth, groupCount) * groupNum;
        }
        return xScale(d.x) + xScale.rangeBand() / groupCount * groupNum;
      }

      function y(d) {
        if ((isHorizontal && d.y < 0) || (!isHorizontal && d.y > 0)) {
          return yScale(d.y0);
        }
        return yScale(d.y0 + d.y);
      }

      function widthFunc(d, i) {
        if (isTimeScale) {
          return datumWidth(barWidth, d, bars.data()[i + 1], xScale, gutterWidth, groupCount);
        }
        return xScale.rangeBand() / groupCount;
      }

      function heightFunc(d) {
        // for split bars or for one series,
        // last series will have d.y0 = 0
        if (d.y0 === 0 && yMin > 0) {
          return yScale(yMin) - yScale(d.y);
        }

        return Math.abs(yScale(d.y0) - yScale(d.y0 + d.y));
      }

      // update
      bars
        .attr('x', isHorizontal ? x : y)
        .attr('width', isHorizontal ? widthFunc : heightFunc)
        .attr('y', isHorizontal ? y : x)
        .attr('height', isHorizontal ? heightFunc : widthFunc);

      return bars;
    }

    /**
     * Adds grouped bars to column chart visualization
     *
     * @method addGroupedBars
     * @param bars {D3.UpdateSelection} SVG with rect added
     * @returns {D3.UpdateSelection}
     */
    addGroupedBars(bars) {
      const xScale = this.getCategoryAxis().getScale();
      const yScale = this.getValueAxis().getScale();
      const groupCount = this.getGroupedCount();
      const groupNum = this.getGroupedNum(this.chartData);
      const gutterSpacingPercentage = 0.15;
      const isTimeScale = this.getCategoryAxis().axisConfig.isTimeDomain();
      const isHorizontal = this.getCategoryAxis().axisConfig.isHorizontal();
      const isLogScale = this.getValueAxis().axisConfig.isLogScale();
      let barWidth;
      let gutterWidth;

      if (isTimeScale) {
        const { min, interval } = this.handler.data.get('ordered');
        let intervalWidth = xScale(min + interval) - xScale(min);
        intervalWidth = Math.abs(intervalWidth);

        gutterWidth = intervalWidth * gutterSpacingPercentage;
        barWidth = (intervalWidth - gutterWidth) / groupCount;
      }

      function x(d, i) {
        if (isTimeScale) {
          return xScale(d.x) + datumWidth(barWidth, d, bars.data()[i + 1], xScale, gutterWidth, groupCount) * groupNum;
        }
        return xScale(d.x) + xScale.rangeBand() / groupCount * groupNum;
      }

      function y(d) {
        if ((isHorizontal && d.y < 0) || (!isHorizontal && d.y > 0)) {
          return yScale(0);
        }

        return yScale(d.y);
      }

      function widthFunc(d, i) {
        if (isTimeScale) {
          return datumWidth(barWidth, d, bars.data()[i + 1], xScale, gutterWidth, groupCount);
        }
        return xScale.rangeBand() / groupCount;
      }

      function heightFunc(d) {
        const baseValue = isLogScale ? 1 : 0;
        return Math.abs(yScale(baseValue) - yScale(d.y));
      }

      // update
      bars
        .attr('x', isHorizontal ? x : y)
        .attr('width', isHorizontal ? widthFunc : heightFunc)
        .attr('y', isHorizontal ? y : x)
        .attr('height', isHorizontal ? heightFunc : widthFunc);

      return bars;
    }

    /**
     * Renders d3 visualization
     *
     * @method draw
     * @returns {Function} Creates the vertical bar chart
     */
    draw() {
      const self = this;

      return function (selection) {
        selection.each(function () {
          const svg = self.chartEl.append('g');
          svg.data([self.chartData]);

          const bars = self.addBars(svg, self.chartData);
          self.addCircleEvents(bars);

          self.events.emit('rendered', {
            chart: self.chartData
          });

          return svg;
        });
      };
    }
  }

  return ColumnChart;
}
