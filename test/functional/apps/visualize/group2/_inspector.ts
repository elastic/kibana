/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const inspector = getService('inspector');
  const filterBar = getService('filterBar');
  const monacoEditor = getService('monacoEditor');
  const PageObjects = getPageObjects(['visualize', 'visEditor', 'visChart', 'timePicker']);

  describe('inspector', function describeIndexTests() {
    before(async function () {
      await PageObjects.visualize.initTests();
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();

      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    describe('advanced input JSON', () => {
      it('should have "missing" property with value 10', async () => {
        log.debug('Add Max Metric on memory field');
        await PageObjects.visEditor.clickBucket('Y-axis', 'metrics');
        await PageObjects.visEditor.selectAggregation('Max', 'metrics');
        await PageObjects.visEditor.selectField('memory', 'metrics');

        log.debug('Add value to advanced JSON input');
        await PageObjects.visEditor.toggleAdvancedParams('2');
        await PageObjects.visEditor.inputValueInCodeEditor('{ "missing": 10 }');
        await PageObjects.visEditor.clickGo();

        await inspector.open();
        await inspector.openInspectorRequestsView();
        const requestTab = await inspector.getOpenRequestDetailRequestButton();
        await requestTab.click();
        const requestJSON = JSON.parse(await monacoEditor.getCodeEditorValue(1));

        expect(requestJSON.aggs['2'].max).property('missing', 10);
      });

      after(async () => {
        await inspector.close();
        await PageObjects.visEditor.removeDimension(2);
        await PageObjects.visEditor.clickGo();
      });
    });

    describe('inspector table', function indexPatternCreation() {
      it('should update table header when columns change', async function () {
        await inspector.open();
        await inspector.expectTableHeaders(['Count', 'All docs']);
        await inspector.close();

        log.debug('Add Average Metric on machine.ram field');
        await PageObjects.visEditor.clickBucket('Y-axis', 'metrics');
        await PageObjects.visEditor.selectAggregation('Average', 'metrics');
        await PageObjects.visEditor.selectField('machine.ram', 'metrics');
        await PageObjects.visEditor.clickGo();
        await inspector.open();
        await inspector.expectTableHeaders(['Count', 'Average machine.ram', 'All docs']);
        await inspector.close();
      });

      describe('filtering on inspector table values', function () {
        before(async function () {
          log.debug('Add X-axis terms agg on machine.os.raw');
          await PageObjects.visEditor.clickBucket('X-axis');
          await PageObjects.visEditor.selectAggregation('Terms');
          await PageObjects.visEditor.selectField('machine.os.raw');
          await PageObjects.visEditor.setSize(2);
          await PageObjects.visEditor.toggleOtherBucket(3);
          await PageObjects.visEditor.clickGo();
        });

        beforeEach(async function () {
          await inspector.open();
          await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        });

        afterEach(async function () {
          await inspector.close();
          await filterBar.removeFilter('machine.os.raw');
          await PageObjects.visChart.waitForVisualizationRenderingStabilized();
        });

        it('should allow filtering for values', async function () {
          await inspector.expectTableData([
            ['win 8', '2,904', '13,031,579,645.108'],
            ['win xp', '2,858', '13,073,190,186.423'],
            ['Other', '6,920', '13,123,599,766.011'],
          ]);

          await inspector.filterForTableCell(1, 1);
          await PageObjects.visChart.waitForVisualization();
          await inspector.expectTableData([['win 8', '2,904', '13,031,579,645.108']]);
        });

        it('should allow filtering out values', async function () {
          await inspector.filterOutTableCell(1, 1);
          await PageObjects.visChart.waitForVisualization();
          await inspector.expectTableData([
            ['win xp', '2,858', '13,073,190,186.423'],
            ['win 7', '2,814', '13,186,695,551.251'],
            ['Other', '4,106', '13,080,420,659.354'],
          ]);
        });

        it('should allow filtering for other values', async function () {
          await inspector.filterForTableCell(1, 3);
          await PageObjects.visChart.waitForVisualization();
          await inspector.expectTableData([
            ['win 7', '2,814', '13,186,695,551.251'],
            ['ios', '2,784', '13,009,497,206.823'],
            ['Other', '1,322', '13,228,964,670.613'],
          ]);
        });

        it('should allow filtering out other values', async function () {
          await inspector.filterOutTableCell(1, 3);
          await PageObjects.visChart.waitForVisualization();
          await inspector.expectTableData([
            ['win 8', '2,904', '13,031,579,645.108'],
            ['win xp', '2,858', '13,073,190,186.423'],
          ]);
        });
      });
    });
  });
}
