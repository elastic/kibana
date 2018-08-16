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
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('heatmap chart', function indexPatternCreation() {
    const vizName1 = 'Visualization HeatmapChart';
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickHeatmapChart');
      await PageObjects.visualize.clickHeatmapChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('Bucket = X-Axis');
      await PageObjects.visualize.clickBucket('X-Axis');
      log.debug('Aggregation = Date Histogram');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      log.debug('Field = @timestamp');
      await PageObjects.visualize.selectField('@timestamp');
      // leaving Interval set to Auto
      await PageObjects.visualize.clickGo();
      await PageObjects.visualize.waitForVisualization();
    });

    it('should save and load', async function () {
      await PageObjects.visualize.saveVisualization(vizName1);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Save viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizName1);
      await PageObjects.header.waitForToastMessageGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
    });

    it('should save and load', async function () {
      await PageObjects.visualize.saveVisualization(vizName1);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Save viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizName1);
      await PageObjects.header.waitForToastMessageGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.waitForVisualization();
    });

    it('should have inspector enabled', async function () {
      const spyToggleExists = await PageObjects.visualize.isInspectorButtonEnabled();
      expect(spyToggleExists).to.be(true);
    });

    it('should show correct data', async function () {
      // this is only the first page of the tabular data.
      const expectedChartData =  [
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
      ];


      await PageObjects.visualize.openInspector();
      const data = await PageObjects.visualize.getInspectorTableData();
      log.debug(data);
      expect(data).to.eql(expectedChartData);
      await PageObjects.visualize.closeInspector();
    });

    it('should show 4 color ranges as default colorNumbers param', async function () {
      const legends = await PageObjects.visualize.getLegendEntries();
      const expectedLegends = ['0 - 400', '400 - 800', '800 - 1,200', '1,200 - 1,600'];
      expect(legends).to.eql(expectedLegends);
    });

    it('should show 6 color ranges if changed on options', async function () {
      await PageObjects.visualize.clickOptionsTab();
      await PageObjects.visualize.changeHeatmapColorNumbers(6);
      await PageObjects.visualize.clickGo();
      const legends = await PageObjects.visualize.getLegendEntries();
      const expectedLegends = [
        '0 - 267',
        '267 - 534',
        '534 - 800',
        '800 - 1,067',
        '1,067 - 1,334',
        '1,334 - 1,600',
      ];
      expect(legends).to.eql(expectedLegends);
    });
    it('should show 6 custom color ranges', async function () {
      await PageObjects.visualize.clickOptionsTab();
      await PageObjects.visualize.clickEnableCustomRanges();
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.isCustomRangeTableShown();
      await PageObjects.visualize.addCustomRange(0, 100);
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.addCustomRange(100, 200);
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.addCustomRange(200, 300);
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.addCustomRange(300, 400);
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.addCustomRange(400, 500);
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.addCustomRange(500, 600);
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.addCustomRange(600, 700);
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.addCustomRange(700, 800);
      await PageObjects.visualize.clickGo();
      const legends = await PageObjects.visualize.getLegendEntries();
      const expectedLegends = [
        '0 - 100',
        '100 - 200',
        '200 - 300',
        '300 - 400',
        '400 - 500',
        '500 - 600',
        '600 - 700',
        '700 - 800',
      ];
      expect(legends).to.eql(expectedLegends);
    });
  });
}
