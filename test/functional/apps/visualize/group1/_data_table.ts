/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const { visualize, timePicker, visEditor, visChart, common } = getPageObjects([
    'visualize',
    'timePicker',
    'visEditor',
    'visChart',
    'common',
  ]);

  describe('data table', function indexPatternCreation() {
    const vizName1 = 'Visualization DataTable';

    before(async function () {
      await visualize.initTests();
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      log.debug('navigateToApp visualize');
      await visualize.navigateToNewAggBasedVisualization();
      log.debug('clickDataTable');
      await visualize.clickDataTable();
      log.debug('clickNewSearch');
      await visualize.clickNewSearch();
      log.debug('Bucket = Split rows');
      await visEditor.clickBucket('Split rows');
      log.debug('Aggregation = Histogram');
      await visEditor.selectAggregation('Histogram');
      log.debug('Field = bytes');
      await visEditor.selectField('bytes');
      log.debug('Interval = 2000');
      await visEditor.setInterval('2000', { type: 'numeric' });
      await visEditor.clickGo();
    });

    after(async () => {
      await common.unsetTime();
    });

    it('should allow applying changed params', async () => {
      await visEditor.setInterval('1', { type: 'numeric', append: true });
      const interval = await visEditor.getNumericInterval();
      expect(interval).to.be('20001');
      const isApplyButtonEnabled = await visEditor.isApplyEnabled();
      expect(isApplyButtonEnabled).to.be(true);
    });

    it('should allow reseting changed params', async () => {
      await visEditor.clickReset();
      const interval = await visEditor.getNumericInterval();
      expect(interval).to.be('2000');
    });

    it('should be able to save and load', async function () {
      await visualize.saveVisualizationExpectSuccessAndBreadcrumb(vizName1);

      await visualize.loadSavedVisualization(vizName1);
      await visChart.waitForVisualization();
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show correct data', function () {
      const expectedChartData = [
        ['0B', '2,088'],
        ['1.953KB', '2,748'],
        ['3.906KB', '2,707'],
        ['5.859KB', '2,876'],
        ['7.813KB', '2,863'],
        ['9.766KB', '147'],
        ['11.719KB', '148'],
        ['13.672KB', '129'],
        ['15.625KB', '161'],
        ['17.578KB', '137'],
      ];

      return retry.try(async function () {
        await inspector.open();
        await inspector.expectTableData(expectedChartData);
        await inspector.close();
      });
    });

    it('should show correct data when partial rows is on', async () => {
      const expectedChartData = [
        ['0B', '2,088'],
        ['1.953KB', '2,748'],
        ['3.906KB', '2,707'],
        ['5.859KB', '2,876'],
        ['7.813KB', '2,863'],
        ['9.766KB', '147'],
        ['11.719KB', '148'],
        ['13.672KB', '129'],
        ['15.625KB', '161'],
        ['17.578KB', '137'],
      ];
      await visEditor.clickOptionsTab();
      await visEditor.checkSwitch('showPartialRows');
      await visEditor.clickGo();

      return retry.try(async function () {
        await inspector.open();
        await inspector.expectTableData(expectedChartData);
        await inspector.close();
        await visEditor.uncheckSwitch('showPartialRows');
      });
    });

    it('should show percentage columns', async () => {
      async function expectValidTableData() {
        const data = await visChart.getTableVisContent();
        expect(data).to.be.eql([
          ['≥ 0B and < 1,000B', '1,351', '64.703%'],
          ['≥ 1,000B and < 1.953KB', '737', '35.297%'],
        ]);
      }

      // load a plain table
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickDataTable();
      await visualize.clickNewSearch();
      await visEditor.clickBucket('Split rows');
      await visEditor.selectAggregation('Range');
      await visEditor.selectField('bytes');
      await visEditor.clickGo();
      await visEditor.clickOptionsTab();
      await visEditor.setSelectByOptionText('datatableVisualizationPercentageCol', 'Count');
      await visEditor.clickGo();

      await expectValidTableData();

      // check that it works after a save and reload
      const SAVE_NAME = 'viz w/ percents';
      await visualize.saveVisualizationExpectSuccessAndBreadcrumb(SAVE_NAME);

      await visualize.loadSavedVisualization(SAVE_NAME);
      await visChart.waitForVisualization();

      await expectValidTableData();

      // check that it works after selecting a column that's deleted
      await visEditor.clickDataTab();
      await visEditor.clickBucket('Metric', 'metrics');
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('bytes', 'metrics');
      await visEditor.removeDimension(1);
      await visEditor.clickGo();
      await visEditor.clickOptionsTab();

      const data = await visChart.getTableVisContent();
      expect(data).to.be.eql([
        ['≥ 0B and < 1,000B', '344.094B'],
        ['≥ 1,000B and < 1.953KB', '1.697KB'],
      ]);
    });

    it('should show correct data when using average pipeline aggregation', async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickDataTable();
      await visualize.clickNewSearch();
      await visEditor.clickBucket('Metric', 'metrics');
      await visEditor.selectAggregation('Average Bucket', 'metrics');
      await visEditor.selectAggregation('Terms', 'metrics', true);
      await visEditor.selectField('geo.src', 'metrics', true);
      await visEditor.clickGo();
      const data = await visChart.getTableVisContent();
      expect(data).to.be.eql([['14,004', '1,412.6']]);
    });

    it('should show correct data for a data table with date histogram', async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickDataTable();
      await visualize.clickNewSearch();
      await visEditor.clickBucket('Split rows');
      await visEditor.selectAggregation('Date Histogram');
      await visEditor.selectField('@timestamp');
      await visEditor.setInterval('Day');
      await visEditor.clickGo();
      const data = await visChart.getTableVisContent();
      expect(data).to.be.eql([
        ['2015-09-20', '4,757'],
        ['2015-09-21', '4,614'],
        ['2015-09-22', '4,633'],
      ]);
    });

    it('should show correct data when selecting a field by its custom name', async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickDataTable();
      await visualize.clickNewSearch();
      await visEditor.clickBucket('Split rows');
      await visEditor.selectAggregation('Date Histogram');
      await visEditor.selectField('UTC time');
      await visEditor.setInterval('Day');
      await visEditor.clickGo();
      const data = await visChart.getTableVisContent();
      expect(data).to.be.eql([
        ['2015-09-20', '4,757'],
        ['2015-09-21', '4,614'],
        ['2015-09-22', '4,633'],
      ]);
      const header = await visChart.getTableVisHeader();
      expect(header).to.contain('UTC time');
    });

    it('should correctly filter for applied time filter on the main timefield', async () => {
      await filterBar.addFilter({
        field: '@timestamp',
        operation: 'is between',
        value: { from: '2015-09-19', to: '2015-09-21' },
      });
      await visChart.waitForVisualizationRenderingStabilized();
      const data = await visChart.getTableVisContent();
      expect(data).to.be.eql([['2015-09-20', '4,757']]);
    });

    it('should correctly filter for pinned filters', async () => {
      await filterBar.toggleFilterPinned('@timestamp');
      await visChart.waitForVisualizationRenderingStabilized();
      const data = await visChart.getTableVisContent();
      expect(data).to.be.eql([['2015-09-20', '4,757']]);
    });

    it('should show correct data for a data table with top hits', async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickDataTable();
      await visualize.clickNewSearch();
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Top Hit', 'metrics');
      await visEditor.selectField('agent.raw', 'metrics');
      await visEditor.clickGo();
      const data = await visChart.getTableVisContent();
      log.debug(data);
      expect(data.length).to.be.greaterThan(0);
    });

    it('should show correct data for a data table with range agg', async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickDataTable();
      await visualize.clickNewSearch();
      await visEditor.clickBucket('Split rows');
      await visEditor.selectAggregation('Range');
      await visEditor.selectField('bytes');
      await visEditor.clickGo();
      const data = await visChart.getTableVisContent();
      expect(data).to.be.eql([
        ['≥ 0B and < 1,000B', '1,351'],
        ['≥ 1,000B and < 1.953KB', '737'],
      ]);
    });

    describe('otherBucket', () => {
      before(async () => {
        await visualize.navigateToNewAggBasedVisualization();
        await visualize.clickDataTable();
        await visualize.clickNewSearch();
        await visEditor.clickBucket('Split rows');
        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('extension.raw');
        await visEditor.setSize(2);
        await visEditor.clickGo();

        await visEditor.toggleOtherBucket();
        await visEditor.toggleMissingBucket();
        await visEditor.clickGo();
      });

      it('should show correct data', async () => {
        const data = await visChart.getTableVisContent();
        expect(data).to.be.eql([
          ['jpg', '9,109'],
          ['css', '2,159'],
          ['Other', '2,736'],
        ]);
      });

      it('should apply correct filter', async () => {
        await visChart.filterOnTableCell(0, 2);
        await visChart.waitForVisualizationRenderingStabilized();
        const data = await visChart.getTableVisContent();
        expect(data).to.be.eql([
          ['png', '1,373'],
          ['gif', '918'],
          ['Other', '445'],
        ]);
      });
    });

    describe('metricsOnAllLevels', () => {
      before(async () => {
        await visualize.navigateToNewAggBasedVisualization();
        await visualize.clickDataTable();
        await visualize.clickNewSearch();
        await visEditor.clickBucket('Split rows');
        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('extension.raw');
        await visEditor.setSize(2);
        await visEditor.toggleOpenEditor(2, 'false');
        await visEditor.clickBucket('Split rows');
        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('geo.dest');
        await visEditor.toggleOpenEditor(3, 'false');
        await visEditor.clickGo();
      });

      it('should show correct data without showMetricsAtAllLevels', async () => {
        const data = await visChart.getTableVisContent();
        expect(data).to.be.eql([
          ['jpg', 'CN', '1,718'],
          ['jpg', 'IN', '1,511'],
          ['jpg', 'US', '770'],
          ['jpg', 'ID', '314'],
          ['jpg', 'PK', '244'],
          ['css', 'CN', '422'],
          ['css', 'IN', '346'],
          ['css', 'US', '189'],
          ['css', 'ID', '68'],
          ['css', 'BR', '58'],
        ]);
      });

      it('should show correct data without showMetricsAtAllLevels even if showPartialRows is selected', async () => {
        await visEditor.clickOptionsTab();
        await testSubjects.setCheckbox('showPartialRows', 'check');
        await visEditor.clickGo();
        const data = await visChart.getTableVisContent();
        expect(data).to.be.eql([
          ['jpg', 'CN', '1,718'],
          ['jpg', 'IN', '1,511'],
          ['jpg', 'US', '770'],
          ['jpg', 'ID', '314'],
          ['jpg', 'PK', '244'],
          ['css', 'CN', '422'],
          ['css', 'IN', '346'],
          ['css', 'US', '189'],
          ['css', 'ID', '68'],
          ['css', 'BR', '58'],
        ]);
      });

      it('should show metrics on each level', async () => {
        await visEditor.clickOptionsTab();
        await testSubjects.setCheckbox('showMetricsAtAllLevels', 'check');
        await visEditor.clickGo();
        const data = await visChart.getTableVisContent();
        expect(data).to.be.eql([
          ['jpg', '9,109', 'CN', '1,718'],
          ['jpg', '9,109', 'IN', '1,511'],
          ['jpg', '9,109', 'US', '770'],
          ['jpg', '9,109', 'ID', '314'],
          ['jpg', '9,109', 'PK', '244'],
          ['css', '2,159', 'CN', '422'],
          ['css', '2,159', 'IN', '346'],
          ['css', '2,159', 'US', '189'],
          ['css', '2,159', 'ID', '68'],
          ['css', '2,159', 'BR', '58'],
        ]);
      });

      it('should show metrics other than count on each level', async () => {
        await visEditor.clickDataTab();
        await visEditor.clickBucket('Metric', 'metrics');
        await visEditor.selectAggregation('Average', 'metrics');
        await visEditor.selectField('bytes', 'metrics');
        await visEditor.clickGo();
        const data = await visChart.getTableVisContent();
        expect(data).to.be.eql([
          ['jpg', '9,109', '5.469KB', 'CN', '1,718', '5.477KB'],
          ['jpg', '9,109', '5.469KB', 'IN', '1,511', '5.456KB'],
          ['jpg', '9,109', '5.469KB', 'US', '770', '5.371KB'],
          ['jpg', '9,109', '5.469KB', 'ID', '314', '5.424KB'],
          ['jpg', '9,109', '5.469KB', 'PK', '244', '5.41KB'],
          ['css', '2,159', '5.566KB', 'CN', '422', '5.712KB'],
          ['css', '2,159', '5.566KB', 'IN', '346', '5.754KB'],
          ['css', '2,159', '5.566KB', 'US', '189', '5.333KB'],
          ['css', '2,159', '5.566KB', 'ID', '68', '4.82KB'],
          ['css', '2,159', '5.566KB', 'BR', '58', '5.915KB'],
        ]);
      });
    });

    describe('split tables', () => {
      before(async () => {
        await visualize.navigateToNewAggBasedVisualization();
        await visualize.clickDataTable();
        await visualize.clickNewSearch();
        await visEditor.clickBucket('Split table');
        // split by column to make all tables rows visible
        await visEditor.clickSplitDirection('Columns');
        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('extension.raw');
        await visEditor.setSize(2);
        await visEditor.toggleOpenEditor(2, 'false');
        await visEditor.clickBucket('Split rows');
        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('geo.dest');
        await visEditor.setSize(3, 3);
        await visEditor.toggleOpenEditor(3, 'false');
        await visEditor.clickBucket('Split rows');
        await visEditor.selectAggregation('Terms');
        await visEditor.selectField('geo.src');
        await visEditor.setSize(3, 4);
        await visEditor.toggleOpenEditor(4, 'false');
        await visEditor.clickGo();
      });

      it('should have a splitted table', async () => {
        const data = await visChart.getTableVisContent();
        expect(data).to.be.eql([
          [
            ['CN', 'CN', '330'],
            ['CN', 'IN', '274'],
            ['CN', 'US', '140'],
            ['IN', 'CN', '286'],
            ['IN', 'IN', '281'],
            ['IN', 'US', '133'],
            ['US', 'CN', '135'],
            ['US', 'IN', '134'],
            ['US', 'US', '52'],
          ],
          [
            ['CN', 'CN', '90'],
            ['CN', 'IN', '84'],
            ['CN', 'US', '27'],
            ['IN', 'CN', '69'],
            ['IN', 'IN', '58'],
            ['IN', 'US', '34'],
            ['US', 'IN', '36'],
            ['US', 'CN', '29'],
            ['US', 'US', '13'],
          ],
        ]);
      });

      it('should show metrics for split bucket when using showMetricsAtAllLevels', async () => {
        await visEditor.clickOptionsTab();
        await testSubjects.setCheckbox('showMetricsAtAllLevels', 'check');
        await visEditor.clickGo();
        const data = await visChart.getTableVisContent();
        expect(data).to.be.eql([
          [
            ['CN', '1,718', 'CN', '330'],
            ['CN', '1,718', 'IN', '274'],
            ['CN', '1,718', 'US', '140'],
            ['IN', '1,511', 'CN', '286'],
            ['IN', '1,511', 'IN', '281'],
            ['IN', '1,511', 'US', '133'],
            ['US', '770', 'CN', '135'],
            ['US', '770', 'IN', '134'],
            ['US', '770', 'US', '52'],
          ],
          [
            ['CN', '422', 'CN', '90'],
            ['CN', '422', 'IN', '84'],
            ['CN', '422', 'US', '27'],
            ['IN', '346', 'CN', '69'],
            ['IN', '346', 'IN', '58'],
            ['IN', '346', 'US', '34'],
            ['US', '189', 'IN', '36'],
            ['US', '189', 'CN', '29'],
            ['US', '189', 'US', '13'],
          ],
        ]);
      });
    });
  });
}
