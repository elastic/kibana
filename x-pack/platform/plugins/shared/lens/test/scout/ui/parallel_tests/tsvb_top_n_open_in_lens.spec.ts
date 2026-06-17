/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../fixtures';

const CONVERT_TO_LENS_ACTION = 'embeddablePanelAction-ACTION_EDIT_IN_LENS';

spaceTest.describe('TSVB Top N - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.TSVB_TOP_N);
    await scoutSpace.uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify({
        from: testData.LOGSTASH_IN_RANGE_DATES.from,
        to: testData.LOGSTASH_IN_RANGE_DATES.to,
      }),
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { dashboard } = pageObjects;
    await dashboard.goto();
    await dashboard.clickDashboardTitleLink(testData.TSVB_DASHBOARDS.TOP_N);
    await dashboard.switchToEditMode();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should show the "Convert to Lens" menu item for a count aggregation',
    async ({ pageObjects }) => {
      const { dashboard } = pageObjects;
      const hasAction = await dashboard.panelHasAction(CONVERT_TO_LENS_ACTION, 'Top N - Basic');
      expect(hasAction).toBe(true);
    }
  );

  spaceTest('should not allow converting of invalid panel', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;
    const hasAction = await dashboard.panelHasAction(
      CONVERT_TO_LENS_ACTION,
      'Top N - Invalid panel'
    );
    expect(hasAction).toBe(false);
  });

  spaceTest('should not allow converting of unsupported aggregations', async ({ pageObjects }) => {
    const { dashboard } = pageObjects;
    const hasAction = await dashboard.panelHasAction(
      CONVERT_TO_LENS_ACTION,
      'Top N - Unsupported agg'
    );
    expect(hasAction).toBe(false);
  });

  spaceTest(
    'should hide "Convert to Lens" for sibling pipeline aggregations',
    async ({ pageObjects }) => {
      const { dashboard } = pageObjects;
      const hasAction = await dashboard.panelHasAction(
        CONVERT_TO_LENS_ACTION,
        'Top N - Sibling pipeline agg'
      );
      expect(hasAction).toBe(false);
    }
  );

  spaceTest(
    'should hide "Convert to Lens" for parent pipeline aggregations',
    async ({ pageObjects }) => {
      const { dashboard } = pageObjects;
      const hasAction = await dashboard.panelHasAction(
        CONVERT_TO_LENS_ACTION,
        'Top N - Parent pipeline agg'
      );
      expect(hasAction).toBe(false);
    }
  );

  spaceTest('should convert to horizontal bar', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Top N - Horizontal bar');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    const chartSwitcher = page.testSubj.locator('lnsChartSwitchPopover');
    await expect(chartSwitcher).toHaveText('Bar');

    const yDimension = page.testSubj
      .locator('lnsXY_yDimensionPanel')
      .locator('lns-dimensionTrigger');
    await expect(yDimension).toHaveText('Maximum of memory');
  });

  spaceTest('should convert group by to vertical axis', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Top N - Group by');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    const xDimension = page.testSubj
      .locator('lnsXY_xDimensionPanel')
      .locator('lns-dimensionTrigger');
    const yDimension = page.testSubj
      .locator('lnsXY_yDimensionPanel')
      .locator('lns-dimensionTrigger');
    await expect(xDimension).toHaveText('Top 10 values of extension.raw');
    await expect(yDimension).toHaveText('Count of records');
  });

  spaceTest(
    'should convert last value mode to reduced time range',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Top N - Last value');
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

      const yDimension = page.testSubj
        .locator('lnsXY_yDimensionPanel')
        .locator('lns-dimensionTrigger');
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
      await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Top N - Static value');
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

      // Verify 2 layers
      const layerTabs = page.testSubj.locator('lns-layerPanel');
      await expect(layerTabs).toHaveCount(2);

      // Layer 0: Count of records
      const layer0YDimension = page.testSubj
        .locator('lns-layerPanel')
        .filter({ hasText: 'Count of records' })
        .locator(
          '[data-test-subj="lnsXY_yDimensionPanel"] [data-test-subj="lns-dimensionTrigger"]'
        );
      await expect(layer0YDimension).toHaveText('Count of records');

      // Layer 1: Static value 10
      const layer1YDimension = page.testSubj
        .locator('lns-layerPanel')
        .filter({ hasText: '10' })
        .locator(
          '[data-test-subj="lnsXY_yDimensionPanel"] [data-test-subj="lns-dimensionTrigger"]'
        );
      await expect(layer1YDimension).toHaveText('10');
    }
  );

  spaceTest('should visualize field to Lens', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Top N - Basic');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    const yDimension = page.testSubj
      .locator('lnsXY_yDimensionPanel')
      .locator('lns-dimensionTrigger');
    await expect(yDimension).toHaveText('Count of records');
  });

  spaceTest('should preserve app filters in lens', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Top N - With filter');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    const filterBadge = page.locator('[data-test-subj="filter-badge-extension"]');
    await expect(filterBadge).toBeVisible();
  });

  spaceTest('should preserve query in lens', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Top N - With query');
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

    const queryInput = page.testSubj.locator('queryInput');
    await expect(queryInput).toHaveText('machine.os : ios');
  });

  spaceTest(
    'should bring ignore global filters at series level over',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(
        CONVERT_TO_LENS_ACTION,
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
        CONVERT_TO_LENS_ACTION,
        'Top N - Ignore global filters panel'
      );
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );
});
