/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TSVB Open in Lens — Scout migration coverage notes
 *
 * These tests verify that TSVB panels convert correctly to Lens (conversion logic only).
 * The following flows are NOT yet covered and should be added:
 *
 * TODO: Save & return to dashboard — does the converted panel persist after saving?
 * TODO: Replace in dashboard — does the converted Lens panel replace the original TSVB panel?
 * TODO: Save to library — can the converted visualization be saved as a library item?
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData, getImportedDashboardId } from '../../../fixtures';

spaceTest.describe('TSVB Top N - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  let dashboardId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.TSVB_TOP_N);
    dashboardId = getImportedDashboardId(imported, testData.TSVB_DASHBOARDS.TOP_N);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_ID.LOGSTASH);
    await scoutSpace.uiSettings.setDefaultTime(testData.LOGSTASH_IN_RANGE_DATES);
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'UTC' });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openDashboardWithIdInEditMode(dashboardId);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  // Negative cases grouped — these don't navigate away from the dashboard,
  // so they can share one browser context via test.step().
  spaceTest('should check Convert to Lens action availability', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;

    await spaceTest.step('invalid panel has no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.CONVERT_TO_LENS_ACTION,
        'Top N - Invalid panel'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step('unsupported aggregations have no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.CONVERT_TO_LENS_ACTION,
        'Top N - Unsupported agg'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step(
      'sibling pipeline aggregations have no Convert to Lens action',
      async () => {
        const hasAction = await dashboard.panelHasAction(
          testData.CONVERT_TO_LENS_ACTION,
          'Top N - Sibling pipeline agg'
        );
        expect(hasAction).toBe(false);
      }
    );

    await spaceTest.step(
      'parent pipeline aggregations have no Convert to Lens action',
      async () => {
        const hasAction = await dashboard.panelHasAction(
          testData.CONVERT_TO_LENS_ACTION,
          'Top N - Parent pipeline agg'
        );
        expect(hasAction).toBe(false);
      }
    );

    await spaceTest.step('count aggregation has Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.CONVERT_TO_LENS_ACTION,
        'Top N - Basic'
      );
      expect(hasAction).toBe(true);
    });
  });

  spaceTest('should convert to horizontal bar', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Top N - Horizontal bar');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    const chartSwitcher = page.testSubj.locator('lnsChartSwitchPopover');
    await expect(chartSwitcher).toHaveText('Bar');

    const yDimension = page.testSubj
      .locator('lnsXY_yDimensionPanel')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(yDimension).toHaveText('Maximum of memory');
  });

  spaceTest('should convert group by to vertical axis', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Top N - Group by');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

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
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Top N - Last value');
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

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
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Top N - Static value');
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

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
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Top N - Basic');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    const yDimension = page.testSubj
      .locator('lnsXY_yDimensionPanel')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(yDimension).toHaveText('Count of records');
  });

  spaceTest('should preserve app filters in lens', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Top N - With filter');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    expect(await pageObjects.filterBar.hasFilter({ field: 'extension', value: 'css' })).toBe(true);
  });

  spaceTest('should preserve query in lens', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Top N - With query');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    const queryInput = page.testSubj.locator('queryInput');
    await expect(queryInput).toHaveValue('machine.os : ios');
  });

  spaceTest(
    'should bring ignore global filters at series level over',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(
        testData.CONVERT_TO_LENS_ACTION,
        'Top N - Ignore global filters series'
      );
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );

  spaceTest(
    'should bring ignore global filters at panel level over',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(
        testData.CONVERT_TO_LENS_ACTION,
        'Top N - Ignore global filters panel'
      );
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );
});
