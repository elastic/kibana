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
import { testData } from '../fixtures';

const CONVERT_TO_LENS_ACTION = 'embeddablePanelAction-ACTION_EDIT_IN_LENS';

spaceTest.describe('TSVB Table - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.TSVB_TABLE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_ID.LOGSTASH);
    await scoutSpace.uiSettings.setDefaultTime(testData.LOGSTASH_IN_RANGE_DATES);
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'UTC' });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { dashboard } = pageObjects;
    await dashboard.goto();
    await dashboard.clickDashboardTitleLink(testData.TSVB_DASHBOARDS.TABLE);
    await dashboard.switchToEditMode();
    await dashboard.waitForRenderComplete();
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
        CONVERT_TO_LENS_ACTION,
        'Table - Invalid panel'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step('unsupported aggregations have no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        CONVERT_TO_LENS_ACTION,
        'Table - Unsupported agg'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step(
      'sibling pipeline aggregations have no Convert to Lens action',
      async () => {
        const hasAction = await dashboard.panelHasAction(
          CONVERT_TO_LENS_ACTION,
          'Table - Sibling pipeline agg'
        );
        expect(hasAction).toBe(false);
      }
    );

    await spaceTest.step(
      'parent pipeline aggregations have no Convert to Lens action',
      async () => {
        const hasAction = await dashboard.panelHasAction(
          CONVERT_TO_LENS_ACTION,
          'Table - Parent pipeline agg'
        );
        expect(hasAction).toBe(false);
      }
    );

    await spaceTest.step('invalid aggregation function has no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        CONVERT_TO_LENS_ACTION,
        'Table - Invalid agg'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step(
      'different aggregation function has no Convert to Lens action',
      async () => {
        const hasAction = await dashboard.panelHasAction(
          CONVERT_TO_LENS_ACTION,
          'Table - Different agg function'
        );
        expect(hasAction).toBe(false);
      }
    );

    await spaceTest.step('count aggregation has Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(CONVERT_TO_LENS_ACTION, 'Table - Basic');
      expect(hasAction).toBe(true);
    });
  });

  spaceTest(
    'should convert last value mode to reduced time range',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Table - Last value mode');
      await expect(page.testSubj.locator('lnsDataTable')).toBeVisible();

      const dimensions = page.testSubj
        .locator('lnsDatatable_metrics')
        .locator('[data-test-subj="lns-dimensionTrigger"]');
      await expect(dimensions.filter({ hasText: 'Count of records last 1m' })).toBeVisible();
    }
  );

  spaceTest(
    'should convert static value to the metric dimension',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Table - Static value');
      await expect(page.testSubj.locator('lnsDataTable')).toBeVisible();

      const dimensions = page.testSubj
        .locator('lnsDatatable_metrics')
        .locator('[data-test-subj="lns-dimensionTrigger"]');
      await expect(dimensions).toHaveText(['Count of records', '10']);
    }
  );

  spaceTest('should convert aggregate by to split row dimension', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Table - Agg by');
    await expect(page.testSubj.locator('lnsDataTable')).toBeVisible();

    const splitRows = page.testSubj
      .locator('lnsDatatable_rows')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(splitRows).toHaveText([
      'Top 10 values of machine.os.raw',
      'Top 10 values of clientip',
    ]);
  });

  spaceTest('should convert group by field with custom label', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Table - GroupBy label');
    await expect(page.testSubj.locator('lnsDataTable')).toBeVisible();

    const splitRows = page.testSubj
      .locator('lnsDatatable_rows')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(splitRows.filter({ hasText: 'test' })).toBeVisible();
  });

  spaceTest('should convert color ranges', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'Table - Color ranges');
    await expect(page.testSubj.locator('lnsDataTable')).toBeVisible();

    const dimensions = page.testSubj
      .locator('lnsDatatable_metrics')
      .locator('[data-test-subj="lns-dimensionTrigger"]');
    await expect(dimensions).toHaveCount(1);
  });

  spaceTest(
    'should bring the ignore global filters configured at panel level over',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(
        CONVERT_TO_LENS_ACTION,
        'Table - Ignore global filters panel'
      );
      await expect(page.testSubj.locator('lnsDataTable')).toBeVisible();
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );
});
