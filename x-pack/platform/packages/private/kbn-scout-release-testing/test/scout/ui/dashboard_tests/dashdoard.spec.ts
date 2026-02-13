/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const defaultSettings = {
  defaultIndex: 'logstash-*',
  'dateFormat:tz': 'UTC',
};
const dashboardName = `Test Dashboard ${Date.now()}`;
const fieldStatsSavedSearchName = `Field Stats Search ${Date.now()}`;

test.describe(
  'Dashboard - create with Lens, ES|QL and Field Statistics panels',
  { tag: ['@cloud-stateful-classic'] },
  () => {
    test.beforeAll(async ({ kbnClient, esArchiver }) => {
      await kbnClient.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kbnClient.uiSettings.update(defaultSettings);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: ['dashboard', 'search'] });
    });

    test('can create a dashboard with Lens, ES|QL and Field Statistics panels', async ({
      page,
      pageObjects,
    }) => {
      // Step 1: Create a Field Statistics saved search in Discover
      await pageObjects.discover.goto();
      await page.testSubj.click('dscViewModeFieldStatsButton');
      await expect(page.testSubj.locator('dataVisualizerTable-loaded')).toBeVisible({
        timeout: 15000,
      });
      await pageObjects.discover.saveSearch(fieldStatsSavedSearchName);

      // Step 2: Navigate to Dashboard and create a new one
      await pageObjects.dashboard.goto();
      await pageObjects.dashboard.openNewDashboard();

      // Step 3: Add a Lens panel
      await pageObjects.dashboard.openNewLensPanel();
      await pageObjects.lens.saveAndReturn();
      await expect.poll(async () => pageObjects.dashboard.getPanelCount()).toBe(1);

      // Step 4: Add an ES|QL panel
      await pageObjects.dashboard.openAddPanelFlyout();
      await page.testSubj.locator('dashboardPanelSelectionFlyout__searchInput').fill('ES|QL');
      await page.testSubj.click('create-action-ES|QL');
      await expect(page.testSubj.locator('ESQLEditor')).toBeVisible({ timeout: 15000 });
      await page.testSubj.click('applyFlyoutButton');
      await expect.poll(async () => pageObjects.dashboard.getPanelCount()).toBe(2);

      // Step 5: Add Field Statistics panel from library
      await pageObjects.dashboard.addSavedSearch(fieldStatsSavedSearchName);
      await expect.poll(async () => pageObjects.dashboard.getPanelCount()).toBe(3);

      // Step 6: Save the dashboard
      await pageObjects.dashboard.saveDashboard(dashboardName);
      await pageObjects.toasts.closeAll();

      // Verify the dashboard was saved successfully by checking we're in view mode
      await expect(page.testSubj.locator('dashboardViewOnlyMode')).toBeVisible();
    });
  }
);
