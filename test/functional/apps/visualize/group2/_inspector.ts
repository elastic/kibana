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
  const filterBar = getService('filterBar');
  const { visualize, visEditor, visChart, timePicker } = getPageObjects([
    'visualize',
    'visEditor',
    'visChart',
    'timePicker',
  ]);

  describe('inspector', function describeIndexTests() {
    before(async function () {
      await visualize.initTests();
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickVerticalBarChart();
      await visualize.clickNewSearch();

      await timePicker.setDefaultAbsoluteRange();
    });

    describe('advanced input JSON', () => {
      it('should have "missing" property with value 10', async () => {
        log.debug('Add Max Metric on memory field');
        await visEditor.clickBucket('Y-axis', 'metrics');
        await visEditor.selectAggregation('Max', 'metrics');
        await visEditor.selectField('memory', 'metrics');

        log.debug('Add value to advanced JSON input');
        await visEditor.toggleAdvancedParams('2');
        await visEditor.inputValueInCodeEditor('{ "missing": 10 }');
        await visEditor.clickGo();

        await inspector.open();
        await inspector.openInspectorRequestsView();
        const { body } = await inspector.getRequest(1);
        expect(body.aggs['2'].max).property('missing', 10);
      });

      after(async () => {
        await inspector.close();
        await visEditor.removeDimension(2);
        await visEditor.clickGo();
      });
    });

    describe('inspector table', function indexPatternCreation() {
      it('should update table header when columns change', async function () {
        await inspector.open();
        await inspector.expectTableHeaders(['Count', 'All docs']);
        await inspector.close();

        log.debug('Add Average Metric on machine.ram field');
        await visEditor.clickBucket('Y-axis', 'metrics');
        await visEditor.selectAggregation('Average', 'metrics');
        await visEditor.selectField('machine.ram', 'metrics');
        await visEditor.clickGo();
        await inspector.open();
        await inspector.expectTableHeaders(['Count', 'Average machine.ram', 'All docs']);
        await inspector.close();
      });

      describe('filtering on inspector table values', function () {
        before(async function () {
          log.debug('Add X-axis terms agg on machine.os.raw');
          await visEditor.clickBucket('X-axis');
          await visEditor.selectAggregation('Terms');
          await visEditor.selectField('machine.os.raw');
          await visEditor.setSize(2);
          await visEditor.toggleOtherBucket(3);
          await visEditor.clickGo();
        });

        beforeEach(async function () {
          await inspector.open();
          await visChart.waitForVisualizationRenderingStabilized();
        });

        afterEach(async function () {
          await inspector.close();
          await filterBar.removeFilter('machine.os.raw');
          await visChart.waitForVisualizationRenderingStabilized();
        });

        it('should allow filtering for values', async function () {
          await inspector.expectTableData([
            ['win 8', '2,904', '13,031,579,645.108'],
            ['win xp', '2,858', '13,073,190,186.423'],
            ['Other', '6,920', '13,123,599,766.011'],
          ]);

          await inspector.filterForTableCell({ column: 1, row: 1, filter: 'in' });
          await visChart.waitForVisualization();
          await inspector.expectTableData([['win 8', '2,904', '13,031,579,645.108']]);
        });

        it('should allow filtering out values', async function () {
          await inspector.filterForTableCell({ column: 1, row: 1, filter: 'out' });
          await visChart.waitForVisualization();
          await inspector.expectTableData([
            ['win xp', '2,858', '13,073,190,186.423'],
            ['win 7', '2,814', '13,186,695,551.251'],
            ['Other', '4,106', '13,080,420,659.354'],
          ]);
        });

        it('should allow filtering for other values', async function () {
          await inspector.filterForTableCell({ column: 1, row: 3, filter: 'in' });
          await visChart.waitForVisualization();
          await inspector.expectTableData([
            ['win 7', '2,814', '13,186,695,551.251'],
            ['ios', '2,784', '13,009,497,206.823'],
            ['Other', '1,322', '13,228,964,670.613'],
          ]);
        });

        it('should allow filtering out other values', async function () {
          await inspector.filterForTableCell({ column: 1, row: 3, filter: 'out' });
          await visChart.waitForVisualization();
          await inspector.expectTableData([
            ['win 8', '2,904', '13,031,579,645.108'],
            ['win xp', '2,858', '13,073,190,186.423'],
          ]);
        });
      });
    });
  });
}
