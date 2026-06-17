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

// FLAKY: https://github.com/elastic/kibana/issues/179307
// These tests were historically skipped in stateful FTR (describe.skip).
// Using test.fixme() until stability is confirmed in Scout.
spaceTest.describe('TSVB Dashboard - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.TSVB_DASHBOARD);
    await scoutSpace.uiSettings.set({
      defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': JSON.stringify({
        from: testData.LOGSTASH_IN_RANGE_DATES.from,
        to: testData.LOGSTASH_IN_RANGE_DATES.to,
      }),
    });
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  // https://github.com/elastic/kibana/issues/179307
  spaceTest.fixme(
    'should convert a by value TSVB viz to a Lens viz',
    async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      const { dashboard, lens } = pageObjects;

      await dashboard.goto();
      await dashboard.clickDashboardTitleLink(testData.TSVB_DASHBOARDS.DASHBOARD_1);
      await dashboard.switchToEditMode();
      await dashboard.waitForRenderComplete();

      const originalPanelCount = await dashboard.getPanelCount();

      // Set custom time range on the panel
      await dashboard.openCustomizePanel('My TSVB to Lens viz 1');
      await dashboard.enableCustomTimeRange();
      await dashboard.openDatePickerQuickMenu();
      await dashboard.clickCommonlyUsedTimeRange('Last_30 days');
      await dashboard.saveCustomizePanel();
      await dashboard.waitForRenderComplete();
      await dashboard.expectTimeRangeBadgeExists();

      // Convert to Lens
      await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, 'My TSVB to Lens viz 1');
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

      const dimensions = page.testSubj.locator('lns-dimensionTrigger');
      await expect(dimensions.getByText('Count of records')).toBeVisible();

      // Replace in dashboard
      await lens.saveAndReturn();
      await dashboard.waitForRenderComplete();

      const newPanelCount = await dashboard.getPanelCount();
      expect(newPanelCount).toBe(originalPanelCount);

      const titles = await dashboard.getPanelTitles();
      expect(titles[0]).toBe('My TSVB to Lens viz 1 (converted)');
      await dashboard.expectTimeRangeBadgeExists();
      await dashboard.removePanel('My TSVB to Lens viz 1 (converted)');
    }
  );

  // https://github.com/elastic/kibana/issues/179307
  spaceTest.fixme(
    'should convert a by reference TSVB viz to a Lens viz',
    async ({ browserAuth, page, pageObjects }) => {
      const visTitle = 'My TSVB to Lens viz 2';
      await browserAuth.loginAsAdmin();
      const { dashboard, lens } = pageObjects;

      await dashboard.goto();
      await dashboard.clickDashboardTitleLink(testData.TSVB_DASHBOARDS.DASHBOARD_2);
      await dashboard.switchToEditMode();

      // Save to library first
      await dashboard.saveToLibrary(visTitle);
      await dashboard.waitForRenderComplete();

      const originalPanelCount = await dashboard.getPanelCount();

      // Set custom time range on the panel
      await dashboard.openCustomizePanel(visTitle);
      await dashboard.enableCustomTimeRange();
      await dashboard.openDatePickerQuickMenu();
      await dashboard.clickCommonlyUsedTimeRange('Last_30 days');
      await dashboard.saveCustomizePanel();
      await dashboard.waitForRenderComplete();
      await dashboard.expectTimeRangeBadgeExists();

      // Convert to Lens
      await dashboard.clickPanelAction(CONVERT_TO_LENS_ACTION, visTitle);
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();

      const dimensions = page.testSubj.locator('lns-dimensionTrigger');
      await expect(dimensions.getByText('Count of records')).toBeVisible();

      // Replace in dashboard
      await lens.saveAndReturn();
      await dashboard.waitForRenderComplete();

      const newPanelCount = await dashboard.getPanelCount();
      expect(newPanelCount).toBe(originalPanelCount);

      const titles = await dashboard.getPanelTitles();
      expect(titles[0]).toBe(`${visTitle} (converted)`);
      await dashboard.expectNotLinkedToLibrary(`${visTitle} (converted)`);
      await dashboard.expectTimeRangeBadgeExists();
      await dashboard.removePanel(`${visTitle} (converted)`);
    }
  );
});
