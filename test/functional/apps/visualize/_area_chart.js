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

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const inspector = getService('inspector');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('area charts', function indexPatternCreation() {
    const vizName1 = 'Visualization AreaChart Name Test';

    const initAreaChart = async () => {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickAreaChart');
      await PageObjects.visualize.clickAreaChart();
      log.debug('clickNewSearch');
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('Click X-Axis');
      await PageObjects.visualize.clickBucket('X-Axis');
      log.debug('Click Date Histogram');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      log.debug('Check field value');
      const fieldValue = await PageObjects.visualize.getField();
      log.debug('fieldValue = ' + fieldValue);
      expect(fieldValue).to.be('@timestamp');
      const intervalValue = await PageObjects.visualize.getInterval();
      log.debug('intervalValue = ' + intervalValue);
      expect(intervalValue).to.be('Auto');
      return PageObjects.visualize.clickGo();
    };

    before(initAreaChart);

    it('should save and load with special characters', async function () {
      const vizNamewithSpecialChars = vizName1 + '/?&=%';
      await PageObjects.visualize.saveVisualizationExpectSuccess(vizNamewithSpecialChars);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Save viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizNamewithSpecialChars);
      await PageObjects.visualize.waitForVisualizationSavedToastGone();
    });

    it('should save and load with non-ascii characters', async function () {
      const vizNamewithSpecialChars = `${vizName1} with Umlaut ä`;
      await PageObjects.visualize.saveVisualizationExpectSuccess(vizNamewithSpecialChars);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Saved viz page title with umlaut is ${pageTitle}`);
      expect(pageTitle).to.contain(vizNamewithSpecialChars);
    });

    it('should save and load', async function () {
      await PageObjects.visualize.saveVisualizationExpectSuccess(vizName1);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Saved viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizName1);
      await PageObjects.visualize.waitForVisualizationSavedToastGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show correct chart', async function () {
      const xAxisLabels = [ '2015-09-20 00:00', '2015-09-21 00:00',
        '2015-09-22 00:00', '2015-09-23 00:00'
      ];
      const yAxisLabels = ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400', '1,600'];
      const expectedAreaChartData = [37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202,
        683, 1361, 1415, 707, 177, 27, 32, 175, 707, 1408, 1355, 726, 201, 29
      ];

      await retry.try(async function tryingForTime() {
        const labels = await PageObjects.visualize.getXAxisLabels();
        log.debug('X-Axis labels = ' + labels);
        expect(labels).to.eql(xAxisLabels);
      });
      const labels = await PageObjects.visualize.getYAxisLabels();
      log.debug('Y-Axis labels = ' + labels);
      expect(labels).to.eql(yAxisLabels);
      const paths = await PageObjects.visualize.getAreaChartData('Count');
      log.debug('expectedAreaChartData = ' + expectedAreaChartData);
      log.debug('actual chart data =     ' + paths);
      expect(paths).to.eql(expectedAreaChartData);
    });

    it('should show correct data', async function () {
      const expectedTableData = [
        ['2015-09-20 00:00', '37'],
        ['2015-09-20 03:00', '202'],
        ['2015-09-20 06:00', '740'],
        ['2015-09-20 09:00', '1,437'],
        ['2015-09-20 12:00', '1,371'],
        ['2015-09-20 15:00', '751'],
        ['2015-09-20 18:00', '188'],
        ['2015-09-20 21:00', '31'],
        ['2015-09-21 00:00', '42'],
        ['2015-09-21 03:00', '202'],
        ['2015-09-21 06:00', '683'],
        ['2015-09-21 09:00', '1,361'],
        ['2015-09-21 12:00', '1,415'],
        ['2015-09-21 15:00', '707'],
        ['2015-09-21 18:00', '177'],
        ['2015-09-21 21:00', '27'],
        ['2015-09-22 00:00', '32'],
        ['2015-09-22 03:00', '175'],
        ['2015-09-22 06:00', '707'],
        ['2015-09-22 09:00', '1,408'],
        ['2015-09-22 12:00', '1,355'],
        ['2015-09-22 15:00', '726'],
        ['2015-09-22 18:00', '201'],
        ['2015-09-22 21:00', '29']
      ];

      await inspector.open();
      await inspector.setTablePageSize(50);
      await inspector.expectTableData(expectedTableData);
    });

    it('should hide side editor if embed is set to true in url', async () => {
      const url = await browser.getCurrentUrl();
      const embedUrl = url.split('/visualize/').pop().replace('?_g=', '?embed=true&_g=');
      await PageObjects.common.navigateToUrl('visualize', embedUrl);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const sideEditorExists = await PageObjects.visualize.getSideEditorExists();
      expect(sideEditorExists).to.be(false);
    });

    describe.skip('switch between Y axis scale types', () => {
      before(initAreaChart);
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
          '0', '200', '400', '600', '800', '1,000', '1,200', '1,400', '1,600',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting square root scale', async () => {
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = [
          '200', '400', '600', '800', '1,000', '1,200', '1,400',
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
          '0', '200', '400', '600', '800', '1,000', '1,200', '1,400', '1,600',
        ];
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting linear scale', async () => {
        await PageObjects.visualize.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visualize.clickGo();
        const labels = await PageObjects.visualize.getYAxisLabels();
        const expectedLabels = [
          '200', '400', '600', '800', '1,000', '1,200', '1,400',
        ];
        expect(labels).to.eql(expectedLabels);
      });
    });
  });
}
