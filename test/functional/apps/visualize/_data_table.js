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
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'timePicker']);

  describe('data table', function indexPatternCreation() {
    const vizName1 = 'Visualization DataTable';

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickDataTable');
      await PageObjects.visualize.clickDataTable();
      log.debug('clickNewSearch');
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      log.debug('Bucket = Split rows');
      await PageObjects.visualize.clickBucket('Split rows');
      log.debug('Aggregation = Histogram');
      await PageObjects.visualize.selectAggregation('Histogram');
      log.debug('Field = bytes');
      await PageObjects.visualize.selectField('bytes');
      log.debug('Interval = 2000');
      await PageObjects.visualize.setNumericInterval('2000');
      await PageObjects.visualize.clickGo();
    });

    it('should allow applying changed params', async () => {
      await PageObjects.visualize.setNumericInterval('1', { append: true });
      const interval = await PageObjects.visualize.getNumericInterval();
      expect(interval).to.be('20001');
      const isApplyButtonEnabled = await PageObjects.visualize.isApplyEnabled();
      expect(isApplyButtonEnabled).to.be(true);
    });

    it('should allow reseting changed params', async () => {
      await PageObjects.visualize.clickReset();
      const interval = await PageObjects.visualize.getNumericInterval();
      expect(interval).to.be('2000');
    });

    it('should be able to save and load', async function () {
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show correct data', function () {
      const expectedChartData = [
        [ '0B', '2,088' ],
        [ '1.953KB', '2,748' ],
        [ '3.906KB', '2,707' ],
        [ '5.859KB', '2,876' ],
        [ '7.813KB', '2,863' ],
        [ '9.766KB', '147' ],
        [ '11.719KB', '148' ],
        [ '13.672KB', '129' ],
        [ '15.625KB', '161' ],
        [ '17.578KB', '137' ]
      ];

      return retry.try(async function () {
        await inspector.open();
        await inspector.expectTableData(expectedChartData);
        await inspector.close();
      });
    });

    it('should show percentage columns', async () => {
      async function expectValidTableData() {
        const data = await PageObjects.visualize.getTableVisData();
        expect(data.trim().split('\n')).to.be.eql([
          '≥ 0 and < 1000',
          '1,351 64.7%',
          '≥ 1000 and < 2000',
          '737 35.3%',
        ]);
      }

      // load a plain table
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.visualize.clickBucket('Split rows');
      await PageObjects.visualize.selectAggregation('Range');
      await PageObjects.visualize.selectField('bytes');
      await PageObjects.visualize.clickGo();
      await PageObjects.visualize.clickOptionsTab();
      await PageObjects.visualize.setSelectByOptionText(
        'datatableVisualizationPercentageCol',
        'Count'
      );
      await PageObjects.visualize.clickGo();

      await expectValidTableData();

      // check that it works after a save and reload
      const SAVE_NAME = 'viz w/ percents';
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(SAVE_NAME);

      await PageObjects.visualize.loadSavedVisualization(SAVE_NAME);
      await PageObjects.visualize.waitForVisualization();

      await expectValidTableData();

      // check that it works after selecting a column that's deleted
      await PageObjects.visualize.clickData();
      await PageObjects.visualize.clickBucket('Metric', 'metrics');
      await PageObjects.visualize.selectAggregation('Average', 'metrics');
      await PageObjects.visualize.selectField('bytes', 'metrics');
      await PageObjects.visualize.removeDimension(1);
      await PageObjects.visualize.clickGo();
      await PageObjects.visualize.clickOptionsTab();

      const data = await PageObjects.visualize.getTableVisData();
      expect(data.trim().split('\n')).to.be.eql([
        '≥ 0 and < 1000',
        '344.094B',
        '≥ 1000 and < 2000',
        '1.697KB',
      ]);
    });

    it('should show correct data when using average pipeline aggregation', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.visualize.clickBucket('Metric', 'metrics');
      await PageObjects.visualize.selectAggregation('Average Bucket', 'metrics');
      await PageObjects.visualize.selectAggregation('Terms', 'metrics', 'buckets');
      await PageObjects.visualize.selectField('geo.src', 'metrics', 'buckets');
      await PageObjects.visualize.clickGo();
      const data = await PageObjects.visualize.getTableVisData();
      log.debug(data.split('\n'));
      expect(data.trim().split('\n')).to.be.eql(['14,004 1,412.6']);
    });

    it('should show correct data for a data table with date histogram', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.visualize.clickBucket('Split rows');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      await PageObjects.visualize.selectField('@timestamp');
      await PageObjects.visualize.setInterval('Daily');
      await PageObjects.visualize.clickGo();
      const data = await PageObjects.visualize.getTableVisData();
      log.debug(data.split('\n'));
      expect(data.trim().split('\n')).to.be.eql([
        '2015-09-20', '4,757',
        '2015-09-21', '4,614',
        '2015-09-22', '4,633',
      ]);
    });

    it('should show correct data for a data table with date histogram', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.visualize.clickBucket('Split rows');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      await PageObjects.visualize.selectField('@timestamp');
      await PageObjects.visualize.setInterval('Daily');
      await PageObjects.visualize.clickGo();
      const data = await PageObjects.visualize.getTableVisData();
      expect(data.trim().split('\n')).to.be.eql([
        '2015-09-20', '4,757',
        '2015-09-21', '4,614',
        '2015-09-22', '4,633',
      ]);
    });

    it('should correctly filter for applied time filter on the main timefield', async () => {
      await filterBar.addFilter('@timestamp', 'is between', '2015-09-19', '2015-09-21');
      await PageObjects.visualize.waitForVisualizationRenderingStabilized();
      const data = await PageObjects.visualize.getTableVisData();
      expect(data.trim().split('\n')).to.be.eql([
        '2015-09-20', '4,757',
      ]);
    });

    it('should correctly filter for pinned filters', async () => {
      await filterBar.toggleFilterPinned('@timestamp');
      await PageObjects.visualize.waitForVisualizationRenderingStabilized();
      const data = await PageObjects.visualize.getTableVisData();
      expect(data.trim().split('\n')).to.be.eql([
        '2015-09-20', '4,757',
      ]);
    });

    it('should show correct data for a data table with top hits', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.visualize.clickMetricEditor();
      await PageObjects.visualize.selectAggregation('Top Hit', 'metrics');
      await PageObjects.visualize.selectField('agent.raw', 'metrics');
      await PageObjects.visualize.clickGo();
      const data = await PageObjects.visualize.getTableVisData();
      log.debug(data);
      expect(data.length).to.be.greaterThan(0);
    });

    it('should show correct data for a data table with range agg', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.visualize.clickBucket('Split rows');
      await PageObjects.visualize.selectAggregation('Range');
      await PageObjects.visualize.selectField('bytes');
      await PageObjects.visualize.clickGo();
      const data = await PageObjects.visualize.getTableVisData();
      expect(data.trim().split('\n')).to.be.eql([
        '≥ 0 and < 1000', '1,351',
        '≥ 1000 and < 2000', '737',
      ]);
    });


    describe('otherBucket', () => {
      before(async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.visualize.clickBucket('Split rows');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('extension.raw');
        await PageObjects.visualize.setSize(2);
        await PageObjects.visualize.clickGo();

        await PageObjects.visualize.toggleOtherBucket();
        await PageObjects.visualize.toggleMissingBucket();
        await PageObjects.visualize.clickGo();
      });

      it('should show correct data', async () => {
        const data = await PageObjects.visualize.getTableVisContent();
        expect(data).to.be.eql([
          [ 'jpg', '9,109' ],
          [ 'css', '2,159' ],
          [ 'Other', '2,736' ]
        ]);
      });

      it('should apply correct filter', async () => {
        await PageObjects.visualize.filterOnTableCell(1, 3);
        await PageObjects.visualize.waitForVisualizationRenderingStabilized();
        const data = await PageObjects.visualize.getTableVisContent();
        expect(data).to.be.eql([
          [ 'png', '1,373' ],
          [ 'gif', '918' ],
          [ 'Other', '445' ]
        ]);
      });
    });

    describe('metricsOnAllLevels', () => {
      before(async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.visualize.clickBucket('Split rows');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('extension.raw');
        await PageObjects.visualize.setSize(2);
        await PageObjects.visualize.toggleOpenEditor(2, 'false');
        await PageObjects.visualize.clickBucket('Split rows');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('geo.dest');
        await PageObjects.visualize.toggleOpenEditor(3, 'false');
        await PageObjects.visualize.clickGo();
      });

      it('should show correct data without showMetricsAtAllLevels', async () => {
        const data = await PageObjects.visualize.getTableVisContent();
        expect(data).to.be.eql([
          [ 'jpg', 'CN', '1,718' ],
          [ 'jpg', 'IN', '1,511' ],
          [ 'jpg', 'US', '770' ],
          [ 'jpg', 'ID', '314' ],
          [ 'jpg', 'PK', '244' ],
          [ 'css', 'CN', '422' ],
          [ 'css', 'IN', '346' ],
          [ 'css', 'US', '189' ],
          [ 'css', 'ID', '68' ],
          [ 'css', 'BR', '58' ],
        ]);
      });

      it('should show correct data without showMetricsAtAllLevels even if showPartialRows is selected', async () => {
        await PageObjects.visualize.clickOptionsTab();
        await PageObjects.visualize.checkCheckbox('showPartialRows');
        await PageObjects.visualize.clickGo();
        const data = await PageObjects.visualize.getTableVisContent();
        expect(data).to.be.eql([
          [ 'jpg', 'CN', '1,718' ],
          [ 'jpg', 'IN', '1,511' ],
          [ 'jpg', 'US', '770' ],
          [ 'jpg', 'ID', '314' ],
          [ 'jpg', 'PK', '244' ],
          [ 'css', 'CN', '422' ],
          [ 'css', 'IN', '346' ],
          [ 'css', 'US', '189' ],
          [ 'css', 'ID', '68' ],
          [ 'css', 'BR', '58' ],
        ]);
      });

      it('should show metrics on each level', async () => {
        await PageObjects.visualize.clickOptionsTab();
        await PageObjects.visualize.checkCheckbox('showMetricsAtAllLevels');
        await PageObjects.visualize.clickGo();
        const data = await PageObjects.visualize.getTableVisContent();
        expect(data).to.be.eql([
          [ 'jpg', '9,109', 'CN', '1,718' ],
          [ 'jpg', '9,109', 'IN', '1,511' ],
          [ 'jpg', '9,109', 'US', '770' ],
          [ 'jpg', '9,109', 'ID', '314' ],
          [ 'jpg', '9,109', 'PK', '244' ],
          [ 'css', '2,159', 'CN', '422' ],
          [ 'css', '2,159', 'IN', '346' ],
          [ 'css', '2,159', 'US', '189' ],
          [ 'css', '2,159', 'ID', '68' ],
          [ 'css', '2,159', 'BR', '58' ],
        ]);
      });

      it('should show metrics other than count on each level', async () => {
        await PageObjects.visualize.clickData();
        await PageObjects.visualize.clickBucket('Metric', 'metrics');
        await PageObjects.visualize.selectAggregation('Average', 'metrics');
        await PageObjects.visualize.selectField('bytes', 'metrics');
        await PageObjects.visualize.clickGo();
        const data = await PageObjects.visualize.getTableVisContent();
        expect(data).to.be.eql([
          [ 'jpg', '9,109', '5.469KB', 'CN', '1,718', '5.477KB' ],
          [ 'jpg', '9,109', '5.469KB', 'IN', '1,511', '5.456KB' ],
          [ 'jpg', '9,109', '5.469KB', 'US', '770', '5.371KB' ],
          [ 'jpg', '9,109', '5.469KB', 'ID', '314', '5.424KB' ],
          [ 'jpg', '9,109', '5.469KB', 'PK', '244', '5.41KB' ],
          [ 'css', '2,159', '5.566KB', 'CN', '422', '5.712KB' ],
          [ 'css', '2,159', '5.566KB', 'IN', '346', '5.754KB' ],
          [ 'css', '2,159', '5.566KB', 'US', '189', '5.333KB' ],
          [ 'css', '2,159', '5.566KB', 'ID', '68', '4.82KB' ],
          [ 'css', '2,159', '5.566KB', 'BR', '58', '5.915KB' ],
        ]);
      });

    });

    describe('split tables', () => {
      before(async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.visualize.clickBucket('Split table');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('extension.raw');
        await PageObjects.visualize.setSize(2);
        await PageObjects.visualize.toggleOpenEditor(2, 'false');
        await PageObjects.visualize.clickBucket('Split rows');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('geo.dest');
        await PageObjects.visualize.setSize(3, 3);
        await PageObjects.visualize.toggleOpenEditor(3, 'false');
        await PageObjects.visualize.clickBucket('Split rows');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('geo.src');
        await PageObjects.visualize.setSize(3, 4);
        await PageObjects.visualize.toggleOpenEditor(4, 'false');
        await PageObjects.visualize.clickGo();
      });

      it('should have a splitted table', async () => {
        const data = await PageObjects.visualize.getTableVisContent();
        expect(data).to.be.eql([
          [
            [ 'CN', 'CN', '330' ],
            [ 'CN', 'IN', '274' ],
            [ 'CN', 'US', '140' ],
            [ 'IN', 'CN', '286' ],
            [ 'IN', 'IN', '281' ],
            [ 'IN', 'US', '133' ],
            [ 'US', 'CN', '135' ],
            [ 'US', 'IN', '134' ],
            [ 'US', 'US', '52' ],
          ],
          [
            [ 'CN', 'CN', '90' ],
            [ 'CN', 'IN', '84' ],
            [ 'CN', 'US', '27' ],
            [ 'IN', 'CN', '69' ],
            [ 'IN', 'IN', '58' ],
            [ 'IN', 'US', '34' ],
            [ 'US', 'IN', '36' ],
            [ 'US', 'CN', '29' ],
            [ 'US', 'US', '13' ],
          ]
        ]);
      });

      it('should show metrics for split bucket when using showMetricsAtAllLevels', async () => {
        await PageObjects.visualize.clickOptionsTab();
        await PageObjects.visualize.checkCheckbox('showMetricsAtAllLevels');
        await PageObjects.visualize.clickGo();
        const data = await PageObjects.visualize.getTableVisContent();
        expect(data).to.be.eql([
          [
            [ 'CN', '1,718', 'CN', '330' ],
            [ 'CN', '1,718', 'IN', '274' ],
            [ 'CN', '1,718', 'US', '140' ],
            [ 'IN', '1,511', 'CN', '286' ],
            [ 'IN', '1,511', 'IN', '281' ],
            [ 'IN', '1,511', 'US', '133' ],
            [ 'US', '770', 'CN', '135' ],
            [ 'US', '770', 'IN', '134' ],
            [ 'US', '770', 'US', '52' ],
          ],
          [
            [ 'CN', '422', 'CN', '90' ],
            [ 'CN', '422', 'IN', '84' ],
            [ 'CN', '422', 'US', '27' ],
            [ 'IN', '346', 'CN', '69' ],
            [ 'IN', '346', 'IN', '58' ],
            [ 'IN', '346', 'US', '34' ],
            [ 'US', '189', 'IN', '36' ],
            [ 'US', '189', 'CN', '29' ],
            [ 'US', '189', 'US', '13' ],
          ]
        ]);
      });
    });

  });
}
