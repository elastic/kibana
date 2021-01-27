/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from 'test/functional/ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'visualize',
    'timePicker',
    'visEditor',
    'visChart',
    'legacyDataTableVis',
  ]);

  describe('legacy data table visualization', function indexPatternCreation() {
    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      log.debug('clickDataTable');
      await PageObjects.visualize.clickDataTable();
      log.debug('clickNewSearch');
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      log.debug('Bucket = Split rows');
      await PageObjects.visEditor.clickBucket('Split rows');
      log.debug('Aggregation = Histogram');
      await PageObjects.visEditor.selectAggregation('Histogram');
      log.debug('Field = bytes');
      await PageObjects.visEditor.selectField('bytes');
      log.debug('Interval = 2000');
      await PageObjects.visEditor.setInterval('2000', { type: 'numeric' });
      await PageObjects.visEditor.clickGo();
    });

    it('should show percentage columns', async () => {
      async function expectValidTableData() {
        const data = await PageObjects.legacyDataTableVis.getTableVisContent();
        expect(data).to.be.eql([
          ['≥ 0B and < 1,000B', '1,351', '64.703%'],
          ['≥ 1,000B and < 1.953KB', '737', '35.297%'],
        ]);
      }

      // load a plain table
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.visEditor.clickBucket('Split rows');
      await PageObjects.visEditor.selectAggregation('Range');
      await PageObjects.visEditor.selectField('bytes');
      await PageObjects.visEditor.clickGo();
      await PageObjects.visEditor.clickOptionsTab();
      await PageObjects.visEditor.setSelectByOptionText(
        'datatableVisualizationPercentageCol',
        'Count'
      );
      await PageObjects.visEditor.clickGo();

      await expectValidTableData();

      // check that it works after selecting a column that's deleted
      await PageObjects.visEditor.clickDataTab();
      await PageObjects.visEditor.clickBucket('Metric', 'metrics');
      await PageObjects.visEditor.selectAggregation('Average', 'metrics');
      await PageObjects.visEditor.selectField('bytes', 'metrics');
      await PageObjects.visEditor.removeDimension(1);
      await PageObjects.visEditor.clickGo();
      await PageObjects.visEditor.clickOptionsTab();

      const data = await PageObjects.legacyDataTableVis.getTableVisContent();
      expect(data).to.be.eql([
        ['≥ 0B and < 1,000B', '344.094B'],
        ['≥ 1,000B and < 1.953KB', '1.697KB'],
      ]);
    });

    it('should show correct data for a data table with date histogram', async () => {
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.visEditor.clickBucket('Split rows');
      await PageObjects.visEditor.selectAggregation('Date Histogram');
      await PageObjects.visEditor.selectField('@timestamp');
      await PageObjects.visEditor.setInterval('Day');
      await PageObjects.visEditor.clickGo();
      const data = await PageObjects.legacyDataTableVis.getTableVisContent();
      expect(data).to.be.eql([
        ['2015-09-20', '4,757'],
        ['2015-09-21', '4,614'],
        ['2015-09-22', '4,633'],
      ]);
    });

    describe('otherBucket', () => {
      before(async () => {
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.visEditor.clickBucket('Split rows');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('extension.raw');
        await PageObjects.visEditor.setSize(2);
        await PageObjects.visEditor.clickGo();

        await PageObjects.visEditor.toggleOtherBucket();
        await PageObjects.visEditor.toggleMissingBucket();
        await PageObjects.visEditor.clickGo();
      });

      it('should show correct data', async () => {
        const data = await PageObjects.legacyDataTableVis.getTableVisContent();
        expect(data).to.be.eql([
          ['jpg', '9,109'],
          ['css', '2,159'],
          ['Other', '2,736'],
        ]);
      });

      it('should apply correct filter', async () => {
        await PageObjects.legacyDataTableVis.filterOnTableCell(1, 3);
        await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        const data = await PageObjects.legacyDataTableVis.getTableVisContent();
        expect(data).to.be.eql([
          ['png', '1,373'],
          ['gif', '918'],
          ['Other', '445'],
        ]);
      });
    });

    describe('metricsOnAllLevels', () => {
      before(async () => {
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.visEditor.clickBucket('Split rows');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('extension.raw');
        await PageObjects.visEditor.setSize(2);
        await PageObjects.visEditor.toggleOpenEditor(2, 'false');
        await PageObjects.visEditor.clickBucket('Split rows');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('geo.dest');
        await PageObjects.visEditor.toggleOpenEditor(3, 'false');
        await PageObjects.visEditor.clickGo();
      });

      it('should show correct data without showMetricsAtAllLevels', async () => {
        const data = await PageObjects.legacyDataTableVis.getTableVisContent();
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
        await PageObjects.visEditor.clickOptionsTab();
        await testSubjects.setCheckbox('showPartialRows', 'check');
        await PageObjects.visEditor.clickGo();
        const data = await PageObjects.legacyDataTableVis.getTableVisContent();
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
        await PageObjects.visEditor.clickOptionsTab();
        await testSubjects.setCheckbox('showMetricsAtAllLevels', 'check');
        await PageObjects.visEditor.clickGo();
        const data = await PageObjects.legacyDataTableVis.getTableVisContent();
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
        await PageObjects.visEditor.clickDataTab();
        await PageObjects.visEditor.clickBucket('Metric', 'metrics');
        await PageObjects.visEditor.selectAggregation('Average', 'metrics');
        await PageObjects.visEditor.selectField('bytes', 'metrics');
        await PageObjects.visEditor.clickGo();
        const data = await PageObjects.legacyDataTableVis.getTableVisContent();
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
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.visEditor.clickBucket('Split table');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('extension.raw');
        await PageObjects.visEditor.setSize(2);
        await PageObjects.visEditor.toggleOpenEditor(2, 'false');
        await PageObjects.visEditor.clickBucket('Split rows');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('geo.dest');
        await PageObjects.visEditor.setSize(3, 3);
        await PageObjects.visEditor.toggleOpenEditor(3, 'false');
        await PageObjects.visEditor.clickBucket('Split rows');
        await PageObjects.visEditor.selectAggregation('Terms');
        await PageObjects.visEditor.selectField('geo.src');
        await PageObjects.visEditor.setSize(3, 4);
        await PageObjects.visEditor.toggleOpenEditor(4, 'false');
        await PageObjects.visEditor.clickGo();
      });

      it('should have a splitted table', async () => {
        const data = await PageObjects.legacyDataTableVis.getTableVisContent();
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
        await PageObjects.visEditor.clickOptionsTab();
        await testSubjects.setCheckbox('showMetricsAtAllLevels', 'check');
        await PageObjects.visEditor.clickGo();
        const data = await PageObjects.legacyDataTableVis.getTableVisContent();
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
