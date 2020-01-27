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

export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker']);

  describe('heatmap chart', function indexPatternCreation() {
    this.tags('smoke');
    const vizName1 = 'Visualization HeatmapChart';

    before(async function() {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickHeatmapChart');
      await PageObjects.visualize.clickHeatmapChart();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      log.debug('Bucket = X-Axis');
      await PageObjects.visualize.clickBucket('X-axis');
      log.debug('Aggregation = Date Histogram');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      log.debug('Field = @timestamp');
      await PageObjects.visualize.selectField('@timestamp');
      // leaving Interval set to Auto
      await PageObjects.visualize.clickGo();
    });

    it('should save and load', async function() {
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
    });

    it('should have inspector enabled', async function() {
      await inspector.expectIsEnabled();
    });

    it('should show correct data', async function() {
      // this is only the first page of the tabular data.
      const expectedChartData = [
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

      await inspector.open();
      await inspector.expectTableData(expectedChartData);
      await inspector.close();
    });

    it('should show 4 color ranges as default colorNumbers param', async function() {
      const legends = await PageObjects.visualize.getLegendEntries();
      const expectedLegends = ['0 - 400', '400 - 800', '800 - 1,200', '1,200 - 1,600'];
      expect(legends).to.eql(expectedLegends);
    });

    it('should show 6 color ranges if changed on options', async function() {
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
    it('should show 6 custom color ranges', async function() {
      await PageObjects.visualize.clickOptionsTab();
      await PageObjects.visualize.clickEnableCustomRanges();
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.clickAddRange();
      await PageObjects.visualize.clickAddRange();

      log.debug('customize 2 last ranges');
      await PageObjects.visualize.setCustomRangeByIndex(6, '650', '720');
      await PageObjects.visualize.setCustomRangeByIndex(7, '800', '905');

      await PageObjects.visualize.waitForVisualizationRenderingStabilized();
      await PageObjects.visualize.clickGo();
      const legends = await PageObjects.visualize.getLegendEntries();
      const expectedLegends = [
        '0 - 100',
        '100 - 200',
        '200 - 300',
        '300 - 400',
        '400 - 500',
        '500 - 600',
        '650 - 720',
        '800 - 905',
      ];
      expect(legends).to.eql(expectedLegends);
    });
  });
}
