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

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker']);

  describe('line charts', function () {
    const vizName1 = 'Visualization LineChart';

    const initLineChart = async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickLineChart');
      await PageObjects.visualize.clickLineChart();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      log.debug('Bucket = Split Chart');
      await PageObjects.visualize.clickBucket('Split Chart');
      log.debug('Aggregation = Terms');
      await PageObjects.visualize.selectAggregation('Terms');
      log.debug('Field = extension');
      await PageObjects.visualize.selectField('extension.raw');
      log.debug('switch from Rows to Columns');
      await PageObjects.visualize.clickColumns();
      await PageObjects.visualize.clickGo();
    };

    before(initLineChart);

    afterEach(async () => {
      await inspector.close();
    });

    it('should show correct chart', async function () {

      // this test only verifies the numerical part of this data
      // it could also check the legend to verify the extensions
      const expectedChartData = ['jpg 9,109', 'css 2,159', 'png 1,373', 'gif 918', 'php 445'];

      // sleep a bit before trying to get the chart data
      await PageObjects.common.sleep(3000);
      const data = await PageObjects.visualize.getLineChartData();
      log.debug('data=' + data);
      const tolerance = 10; // the y-axis scale is 10000 so 10 is 0.1%
      for (let x = 0; x < data.length; x++) {
        log.debug('x=' + x + ' expectedChartData[x].split(\' \')[1] = ' +
        (expectedChartData[x].split(' ')[1]).replace(',', '') + '  data[x]=' + data[x] +
        ' diff=' + Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]));
        expect(Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]) < tolerance).to.be.ok();
      }
      log.debug('Done');
    });


    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show correct chart order by Term', async function () {
      // this test only verifies the numerical part of this data
      // it could also check the legend to verify the extensions
      const expectedChartData = ['png 1,373', 'php 445', 'jpg 9,109', 'gif 918', 'css 2,159'];

      log.debug('Order By = Term');
      await PageObjects.visualize.selectOrderByMetric(2, '_key');
      await PageObjects.visualize.clickGo();
      await retry.try(async function () {
        const data = await PageObjects.visualize.getLineChartData();
        log.debug('data=' + data);
        const tolerance = 10; // the y-axis scale is 10000 so 10 is 0.1%
        for (let x = 0; x < data.length; x++) {
          log.debug('x=' + x + ' expectedChartData[x].split(\' \')[1] = ' +
            (expectedChartData[x].split(' ')[1]).replace(',', '') + '  data[x]=' + data[x] +
            ' diff=' + Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]));
          expect(Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]) < tolerance).to.be.ok();
        }
        log.debug('Done');
      });
    });

    it('should show correct data, ordered by Term', async function () {

      const expectedChartData = [['png', '1,373'], ['php', '445'], ['jpg', '9,109'], ['gif', '918'], ['css', '2,159']];

      await inspector.open();
      await inspector.expectTableData(expectedChartData);
    });

    it('should be able to save and load', async function () {
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);
      await PageObjects.visualize.waitForVisualizationSavedToastGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
    });

    describe.skip('switch between Y axis scale types', () => {
      before(initLineChart);
      const axisId = 'ValueAxis-1';

      it('should show ticks on selecting log scale', async () => {
        await PageObjects.visualize.clickMetricsAndAxes();
        await PageObjects.visualize.clickYAxisOptions(axisId);
        await PageObjects.visualize.selectYAxisScaleType(axisId, 'log');
        await PageObjects.visualize.clickYAxisAdvancedOptions(axisId);
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = [
          '2', '3', '5', '7', '10', '20', '30', '50', '70', '100', '200',
          '300', '500', '700', '1,000', '2,000', '3,000', '5,000', '7,000',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting log scale', async () => {
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = [
          '2', '3', '5', '7', '10', '20', '30', '50', '70', '100', '200',
          '300', '500', '700', '1,000', '2,000', '3,000', '5,000', '7,000',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show ticks on selecting square root scale', async () => {
        await PageObjects.visualize.selectYAxisScaleType(axisId, 'square root');
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = [
          '0', '2,000', '4,000', '6,000', '8,000', '10,000',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting square root scale', async () => {
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = [
          '2,000', '4,000', '6,000', '8,000',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show ticks on selecting linear scale', async () => {
        await PageObjects.visualize.selectYAxisScaleType(axisId, 'linear');
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        log.debug(labels);
        const expectedLabels = [
          '0', '2,000', '4,000', '6,000', '8,000', '10,000',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting linear scale', async () => {
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = [
          '2,000', '4,000', '6,000', '8,000',
        ];
        expect(labels).to.eql(expectedLabels);
      });
    });
  });
}
