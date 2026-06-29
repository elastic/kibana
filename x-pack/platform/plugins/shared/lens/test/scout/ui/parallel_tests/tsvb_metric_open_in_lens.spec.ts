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

spaceTest.describe('TSVB Metric - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.TSVB_METRIC);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_ID.LOGSTASH);
    await scoutSpace.uiSettings.setDefaultTime(testData.LOGSTASH_IN_RANGE_DATES);
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'UTC' });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    const { dashboard } = pageObjects;
    await dashboard.goto();
    await dashboard.clickDashboardTitleLink(testData.TSVB_DASHBOARDS.METRIC);
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

    await spaceTest.step('unsupported metric has no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.CONVERT_TO_LENS_ACTION,
        'Metric - Unsupported metric'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step('invalid panel has no Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.CONVERT_TO_LENS_ACTION,
        'Metric - Invalid panel'
      );
      expect(hasAction).toBe(false);
    });

    await spaceTest.step('basic metric has Convert to Lens action', async () => {
      const hasAction = await dashboard.panelHasAction(
        testData.CONVERT_TO_LENS_ACTION,
        'Metric - Basic'
      );
      expect(hasAction).toBe(true);
    });
  });

  spaceTest('should convert basic metric to Lens', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Metric - Basic');
    await expect(page.testSubj.locator('mtrVis')).toBeVisible();
    await expect(page.testSubj.locator('mtrVis').getByText('Count of records')).toBeVisible();
  });

  spaceTest('should convert static value', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Metric - Static value');
    await expect(page.testSubj.locator('mtrVis')).toBeVisible();
    const dimensions = page.testSubj.locator('lns-dimensionTrigger');
    await expect(dimensions).toHaveCount(1);
    await expect(dimensions.getByText('10')).toBeVisible();
  });

  spaceTest('should convert metric agg with params', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Metric - Agg with params');
    await expect(page.testSubj.locator('mtrVis')).toBeVisible();
    const dimensions = page.testSubj.locator('lns-dimensionTrigger');
    await expect(dimensions).toHaveCount(1);
    await expect(dimensions.getByText('Count of bytes')).toBeVisible();
  });

  spaceTest('should convert color ranges', async ({ page, pageObjects }) => {
    const { dashboard } = pageObjects;
    await dashboard.clickPanelAction(testData.CONVERT_TO_LENS_ACTION, 'Metric - Color ranges');
    await expect(page.testSubj.locator('mtrVis')).toBeVisible();
    const dimensions = page.testSubj.locator('lns-dimensionTrigger');
    await expect(dimensions).toHaveCount(1);
  });

  spaceTest(
    'should bring ignore global filters at series level over',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(
        testData.CONVERT_TO_LENS_ACTION,
        'Metric - Ignore global filters series'
      );
      await expect(page.testSubj.locator('mtrVis')).toBeVisible();
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );

  spaceTest(
    'should bring ignore global filters at panel level over',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      await dashboard.clickPanelAction(
        testData.CONVERT_TO_LENS_ACTION,
        'Metric - Ignore global filters panel'
      );
      await expect(page.testSubj.locator('mtrVis')).toBeVisible();
      await expect(page.testSubj.locator('lnsChangeIndexPatternIgnoringFilters')).toBeVisible();
    }
  );
});
