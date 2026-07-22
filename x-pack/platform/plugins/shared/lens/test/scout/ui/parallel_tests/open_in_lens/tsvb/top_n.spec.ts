/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData, createOpenInLensSuiteSetup } from '../../../fixtures';

spaceTest.describe('TSVB Top N - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  const openInLensSuite = createOpenInLensSuiteSetup({
    archivePath: testData.KBN_ARCHIVE_PATHS.OPEN_IN_LENS.TSVB.TOP_N,
    dashboardTitles: testData.DASHBOARD_TITLES.OPEN_IN_LENS.TSVB.TOP_N,
  });

  spaceTest.beforeAll(openInLensSuite.beforeAll);

  spaceTest.beforeEach(openInLensSuite.beforeEach);

  spaceTest.afterAll(openInLensSuite.afterAll);

  // Negative cases grouped — these don't navigate away from the dashboard,
  // so they can share one browser context via test.step().
  spaceTest('should check Convert to Lens action availability', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;

    await spaceTest.step('invalid panel has no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Top N - Invalid panel'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step('unsupported aggregations have no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Top N - Unsupported agg'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step(
      'sibling pipeline aggregations have no Convert to Lens action',
      async () => {
        const hasAction = await dashboard.panelHasAction(
          testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
          'Top N - Sibling pipeline agg'
        );
        expect(hasAction).toBe(false);
      }
    );

    await spaceTest.step(
      'parent pipeline aggregations have no Convert to Lens action',
      async () => {
        const hasAction = await dashboard.panelHasAction(
          testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
          'Top N - Parent pipeline agg'
        );
        expect(hasAction).toBe(false);
      }
    );
  });

  spaceTest('should convert to horizontal bar', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Top N - Horizontal bar'
    );
    await lens.waitForVisualization('xyVisChart');

    const chartSwitcher = page.testSubj.locator('lnsChartSwitchPopover');
    await expect(chartSwitcher).toHaveText('Bar');

    const yDimension = page.testSubj
      .locator('lnsXY_yDimensionPanel')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(yDimension).toHaveText('Maximum of memory');
  });

  spaceTest('should convert group by to vertical axis', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Top N - Group by'
    );
    await lens.waitForVisualization('xyVisChart');

    const xDimension = page.testSubj
      .locator('lnsXY_xDimensionPanel')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    const yDimension = page.testSubj
      .locator('lnsXY_yDimensionPanel')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(xDimension).toHaveText('Top 10 values of extension.raw');
    await expect(yDimension).toHaveText('Count of records');
  });

  spaceTest(
    'should convert last value mode to reduced time range',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Top N - Last value'
      );
      await lens.waitForVisualization('xyVisChart');

      const yDimension = page.testSubj
        .locator('lnsXY_yDimensionPanel')
        .locator('[data-test-subj="lns-dimensionTrigger"]');
      await yDimension.click();
      await page.testSubj.locator('indexPattern-advanced-accordion').click();

      const reducedTimeRange = page.testSubj
        .locator('indexPattern-dimension-reducedTimeRange')
        .locator('input[role="combobox"]');
      await expect(reducedTimeRange).toHaveValue('1 minute (1m)');

      await expect(yDimension).toHaveText('Count of records last 1m');
    }
  );

  spaceTest(
    'should convert static value to separate layer with y dimension',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Top N - Static value'
      );
      await lens.waitForVisualization('xyVisChart');

      // Verify 2 layer tabs exist (Lens renders one layer panel at a time, switched via tabs)
      const layerTab1 = page.getByRole('tab', { name: 'Data layer 1' });
      const layerTab2 = page.getByRole('tab', { name: 'Data layer 2' });
      await expect(layerTab1).toBeVisible();
      await expect(layerTab2).toBeVisible();

      // Layer 1: Count of records
      await layerTab1.click();
      const layer1YDimension = page.testSubj
        .locator('lnsXY_yDimensionPanel')
        .locator('[data-test-subj="lns-dimensionTrigger"]');
      await expect(layer1YDimension).toHaveText('Count of records');

      // Layer 2: Static value 10
      await layerTab2.click();
      const layer2YDimension = page.testSubj
        .locator('lnsXY_yDimensionPanel')
        .locator('[data-test-subj="lns-dimensionTrigger"]');
      await expect(layer2YDimension).toHaveText('10');
    }
  );

  spaceTest('should visualize field to Lens', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Top N - Basic'
    );
    await lens.waitForVisualization('xyVisChart');

    const yDimension = page.testSubj
      .locator('lnsXY_yDimensionPanel')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(yDimension).toHaveText('Count of records');
  });

  spaceTest('should preserve app filters in Lens', async ({ pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Top N - With filter'
    );
    await lens.waitForVisualization('xyVisChart');

    expect(await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'css' })).toBe(true);
  });

  spaceTest('should preserve query in Lens', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;
    await dashboard.clickPanelAction(
      testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
      'Top N - With query'
    );
    await lens.waitForVisualization('xyVisChart');

    const queryInput = page.testSubj.locator('queryInput');
    await expect(queryInput).toHaveValue('machine.os : ios');
  });

  spaceTest(
    'should bring ignore global filters at series level over',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Top N - Ignore global filters series'
      );
      await lens.waitForVisualization('xyVisChart');
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );

  spaceTest(
    'should bring ignore global filters at panel level over',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'Top N - Ignore global filters panel'
      );
      await lens.waitForVisualization('xyVisChart');
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );
});
