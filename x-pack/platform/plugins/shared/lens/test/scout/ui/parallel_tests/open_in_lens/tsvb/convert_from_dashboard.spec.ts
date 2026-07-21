/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData, createOpenInLensSuiteSetup } from '../../../fixtures';

// FLAKY: https://github.com/elastic/kibana/issues/179307
// Tracks known stateful FTR flakiness during the Scout migration. Serverless FTR also
// covered these dashboard conversion scenarios, so keep this temporary while follow-up
// coverage is confirmed.
spaceTest.describe('TSVB Dashboard - Open in Lens', { tag: tags.deploymentAgnostic }, () => {
  const openInLensSuite = createOpenInLensSuiteSetup({
    archivePath: testData.KBN_ARCHIVE_PATHS.OPEN_IN_LENS.TSVB.DASHBOARD,
    dashboardTitles: [
      testData.DASHBOARD_TITLES.OPEN_IN_LENS.TSVB.DASHBOARD_1,
      testData.DASHBOARD_TITLES.OPEN_IN_LENS.TSVB.DASHBOARD_2,
    ],
    openDashboardBeforeEach: false,
  });

  spaceTest.beforeAll(openInLensSuite.beforeAll);

  spaceTest.beforeEach(openInLensSuite.beforeEach);

  spaceTest.afterAll(openInLensSuite.afterAll);

  // https://github.com/elastic/kibana/issues/179307
  spaceTest.fixme(
    'should convert a by value TSVB vis to a Lens vis',
    async ({ browserAuth, page, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      const { dashboard, lens } = pageObjects;

      await dashboard.openDashboardWithIdInEditMode(
        openInLensSuite.getDashboardId(testData.DASHBOARD_TITLES.OPEN_IN_LENS.TSVB.DASHBOARD_1)
      );

      const originalPanelCount = await dashboard.getPanelCount();

      // Set custom time range on the panel
      await dashboard.openCustomizePanel('My TSVB to Lens vis 1');
      await dashboard.enableCustomTimeRange();
      await dashboard.openDatePickerQuickMenu();
      await dashboard.clickCommonlyUsedTimeRange('Last_30 days');
      await dashboard.saveCustomizePanel();
      await dashboard.waitForRenderComplete();
      await dashboard.expectTimeRangeBadgeExists();

      // Convert to Lens
      await dashboard.clickPanelAction(
        testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION,
        'My TSVB to Lens vis 1'
      );
      await lens.waitForVisualization('xyVisChart');

      const dimensions = page.testSubj.locator('lns-dimensionTrigger');
      await expect(dimensions.getByText('Count of records')).toBeVisible();

      // Replace in dashboard
      await lens.saveAndReturn();
      await dashboard.waitForRenderComplete();

      const newPanelCount = await dashboard.getPanelCount();
      expect(newPanelCount).toBe(originalPanelCount);

      const titles = await dashboard.getPanelTitles();
      expect(titles[0]).toBe('My TSVB to Lens vis 1 (converted)');
      await dashboard.expectTimeRangeBadgeExists();
      await dashboard.removePanel('My TSVB to Lens vis 1 (converted)');
    }
  );

  // https://github.com/elastic/kibana/issues/179307
  spaceTest.fixme(
    'should convert a by reference TSVB vis to a Lens vis',
    async ({ browserAuth, page, pageObjects }) => {
      const visTitle = 'My TSVB to Lens vis 2';
      await browserAuth.loginAsAdmin();
      const { dashboard, lens } = pageObjects;

      await dashboard.openDashboardWithIdInEditMode(
        openInLensSuite.getDashboardId(testData.DASHBOARD_TITLES.OPEN_IN_LENS.TSVB.DASHBOARD_2)
      );

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
      await dashboard.clickPanelAction(testData.DATA_TEST_SUBJECTS.OPEN_IN_LENS_ACTION, visTitle);
      await lens.waitForVisualization('xyVisChart');

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
