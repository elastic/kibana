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

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from './lib/web_element_wrapper';

export function VisualizeChartProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const config = getService('config');
  const find = getService('find');
  const log = getService('log');
  const retry = getService('retry');
  const defaultFindTimeout = config.get('timeouts.find');

  class VisualizeChart {
    public async getXAxisLabels() {
      const xAxis = await find.byCssSelector('.visAxis--x.visAxis__column--bottom');
      const $ = await xAxis.parseDomContent();
      return $('.x > g > text')
        .toArray()
        .map(tick =>
          $(tick)
            .text()
            .trim()
        );
    }

    public async getYAxisLabels() {
      const yAxis = await find.byCssSelector('.visAxis__column--y.visAxis__column--left');
      const $ = await yAxis.parseDomContent();
      return $('.y > g > text')
        .toArray()
        .map(tick =>
          $(tick)
            .text()
            .trim()
        );
    }

    /*
     ** This method gets the chart data and scales it based on chart height and label.
     ** Returns an array of height values
     */
    public async getAreaChartData(dataLabel: string, axis = 'ValueAxis-1') {
      const yAxisRatio = await this.getChartYAxisRatio(axis);

      const rectangle = await find.byCssSelector('rect.background');
      const yAxisHeight = await rectangle.getAttribute('height');
      log.debug(`height --------- ${yAxisHeight}`);

      const path = await retry.try(
        async () =>
          await find.byCssSelector(`path[data-label="${dataLabel}"]`, defaultFindTimeout * 2)
      );
      const data = await path.getAttribute('d');
      log.debug(data);
      // This area chart data starts with a 'M'ove to a x,y location, followed
      // by a bunch of 'L'ines from that point to the next.  Those points are
      // the values we're going to use to calculate the data values we're testing.
      // So git rid of the one 'M' and split the rest on the 'L's.
      const tempArray = data
        .replace('M ', '')
        .replace('M', '')
        .replace(/ L /g, 'L')
        .replace(/ /g, ',')
        .split('L');
      const chartSections = tempArray.length / 2;
      // log.debug('chartSections = ' + chartSections + ' height = ' + yAxisHeight + ' yAxisLabel = ' + yAxisLabel);
      const chartData = [];
      for (let i = 0; i < chartSections; i++) {
        chartData[i] = Math.round((yAxisHeight - tempArray[i].split(',')[1]) * yAxisRatio);
        log.debug('chartData[i] =' + chartData[i]);
      }
      return chartData;
    }

    /*
     ** This method returns the paths that compose an area chart.
     */
    public async getAreaChartPaths(dataLabel: string) {
      const path = await retry.try(
        async () =>
          await find.byCssSelector(`path[data-label="${dataLabel}"]`, defaultFindTimeout * 2)
      );
      const data = await path.getAttribute('d');
      log.debug(data);
      // This area chart data starts with a 'M'ove to a x,y location, followed
      // by a bunch of 'L'ines from that point to the next.  Those points are
      // the values we're going to use to calculate the data values we're testing.
      // So git rid of the one 'M' and split the rest on the 'L's.
      return data.split('L');
    }

    // The current test shows dots, not a line.  This function gets the dots and normalizes their height.
    async getLineChartData(dataLabel = 'Count', axis = 'ValueAxis-1') {
      // 1). get the range/pixel ratio
      const yAxisRatio = await this.getChartYAxisRatio(axis);
      // 2). find and save the y-axis pixel size (the chart height)
      const rectangle = await find.byCssSelector('clipPath rect');
      const yAxisHeight = await rectangle.getAttribute('height');
      // 3). get the visWrapper__chart elements
      const chartTypes = await retry.try(
        async () =>
          await find.allByCssSelector(
            `.visWrapper__chart circle[data-label="${dataLabel}"][fill-opacity="1"]`,
            defaultFindTimeout * 2
          )
      );
      // 4). for each chart element, find the green circle, then the cy position
      const chartData = await Promise.all(
        chartTypes.map(async chart => {
          const cy = await chart.getAttribute('cy');
          // the point_series_options test has data in the billions range and
          // getting 11 digits of precision with these calculations is very hard
          return Math.round(((yAxisHeight - cy) * yAxisRatio).toPrecision(6));
        })
      );

      return chartData;
    }

    // this is ALMOST identical to DiscoverPage.getBarChartData
    async getBarChartData(dataLabel = 'Count', axis = 'ValueAxis-1') {
      // 1). get the range/pixel ratio
      const yAxisRatio = await this.getChartYAxisRatio(axis);
      // 3). get the visWrapper__chart elements
      const svg = await find.byCssSelector('div.chart');
      const $ = await svg.parseDomContent();
      const chartData = $(`g > g.series > rect[data-label="${dataLabel}"]`)
        .toArray()
        .map(chart => {
          const barHeight = $(chart).attr('height');
          return Math.round(barHeight * yAxisRatio);
        });

      return chartData;
    }

    // Returns value per pixel
    async getChartYAxisRatio(axis = 'ValueAxis-1') {
      // 1). get the maximum chart Y-Axis marker value and Y position
      const maxYAxisChartMarker = await retry.try(
        async () =>
          await find.byCssSelector(
            `div.visAxis__splitAxes--y > div > svg > g.${axis} > g:last-of-type.tick`
          )
      );
      const maxYLabel = (await maxYAxisChartMarker.getVisibleText()).replace(/,/g, '');
      const maxYLabelYPosition = (await maxYAxisChartMarker.getPosition()).y;
      log.debug(`maxYLabel = ${maxYLabel}, maxYLabelYPosition = ${maxYLabelYPosition}`);

      // 2). get the minimum chart Y-Axis marker value and Y position
      const minYAxisChartMarker = await find.byCssSelector(
        'div.visAxis__column--y.visAxis__column--left  > div > div > svg:nth-child(2) > g > g:nth-child(1).tick'
      );
      const minYLabel = (await minYAxisChartMarker.getVisibleText()).replace(',', '');
      const minYLabelYPosition = (await minYAxisChartMarker.getPosition()).y;
      return (maxYLabel - minYLabel) / (minYLabelYPosition - maxYLabelYPosition);
    }

    async getHeatmapData() {
      const chartTypes = await retry.try(
        async () => await find.allByCssSelector('svg > g > g.series rect', defaultFindTimeout * 2)
      );
      log.debug('rects=' + chartTypes);
      async function getChartType(chart) {
        return await chart.getAttribute('data-label');
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return await Promise.all(getChartTypesPromises);
    }
  }

  return new VisualizeChart();
}
