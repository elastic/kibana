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

import expect from '@kbn/expect';

export function PieChartProvider({ getService }) {
  const log = getService('log');
  const retry = getService('retry');
  const config = getService('config');
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const defaultFindTimeout = config.get('timeouts.find');

  return new class PieChart {

    async filterOnPieSlice(name) {
      log.debug(`PieChart.filterOnPieSlice(${name})`);
      if (name) {
        await testSubjects.click(`pieSlice-${name.split(' ').join('-')}`);
      } else {
        // If no pie slice has been provided, find the first one available.
        await retry.try(async () => {
          const slices = await find.allByCssSelector('svg > g > g.arcs > path.slice');
          log.debug('Slices found:' + slices.length);
          return slices[0].click();
        });
      }
    }

    async getPieSlice(name) {
      return await testSubjects.find(`pieSlice-${name.split(' ').join('-')}`);
    }

    async getAllPieSlices(name) {
      return await testSubjects.findAll(`pieSlice-${name.split(' ').join('-')}`);
    }

    async getPieSliceStyle(name) {
      log.debug(`VisualizePage.getPieSliceStyle(${name})`);
      const pieSlice = await this.getPieSlice(name);
      return await pieSlice.getAttribute('style');
    }

    async getAllPieSliceStyles(name) {
      log.debug(`VisualizePage.getAllPieSliceStyles(${name})`);
      const pieSlices = await this.getAllPieSlices(name);
      return await Promise.all(pieSlices.map(async pieSlice => await pieSlice.getAttribute('style')));
    }

    async getPieChartData() {
      const chartTypes = await find.allByCssSelector('path.slice', defaultFindTimeout * 2);

      const getChartTypesPromises = chartTypes.map(async chart => await chart.getAttribute('d'));
      return await Promise.all(getChartTypesPromises);
    }

    async expectPieChartTableData(expectedTableData) {
      await inspector.open();
      await inspector.setTablePageSize(50);
      await inspector.expectTableData(expectedTableData);
    }

    async getPieChartLabels() {
      const chartTypes = await find.allByCssSelector('path.slice', defaultFindTimeout * 2);

      const getChartTypesPromises = chartTypes.map(async chart => await chart.getAttribute('data-label'));
      return await Promise.all(getChartTypesPromises);
    }

    async getPieSliceCount() {
      log.debug('PieChart.getPieSliceCount');
      return await retry.try(async () => {
        const slices = await find.allByCssSelector('svg > g > g.arcs > path.slice');
        return slices.length;
      });
    }

    async expectPieSliceCount(expectedCount) {
      log.debug(`PieChart.expectPieSliceCount(${expectedCount})`);
      await retry.try(async () => {
        const slicesCount = await this.getPieSliceCount();
        expect(slicesCount).to.be(expectedCount);
      });
    }

    async expectPieChartLabels(expectedLabels) {
      log.debug(`PieChart.expectPieChartLabels(${expectedLabels.join(',')})`);
      await retry.try(async () => {
        const pieData = await this.getPieChartLabels();
        expect(pieData).to.eql(expectedLabels);
      });
    }
  };
}
