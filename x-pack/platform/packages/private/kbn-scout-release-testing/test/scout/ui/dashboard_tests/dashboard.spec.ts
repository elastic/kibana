/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, tags } from '@kbn/scout';

const defaultSettings = {
  defaultIndex: 'kibana_sample_data_logs',
  'dateFormat:tz': 'UTC',
};

test.describe('Dashboard app', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await apiServices.sampleData.install('logs');
    await kbnClient.uiSettings.update(defaultSettings);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.goto();
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await apiServices.sampleData.remove('logs');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should create dashboard with ES|QL and Lens panels', async ({ page, pageObjects }) => {
    const dashboardName = 'Test Dashboard with Multiple Panels';

    // Open new dashboard
    await pageObjects.dashboard.openNewDashboard();

    // Add ES|QL panel and save it
    await pageObjects.dashboard.addNewPanel('ES|QL');
    await pageObjects.dashboard.applyAndCloseESQLPanel();
    await expect(page.testSubj.locator('lnsVisualizationContainer')).toBeVisible();
    // Add Lens paneln and save it
    await pageObjects.dashboard.addNewPanel('Lens');
    await pageObjects.lens.dragFieldToWorkspace('records');
    await pageObjects.lens.saveAndReturn();
    // Verify both Lens and ESQL panels are present
    await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
    await expect(page.testSubj.locator('lnsVisualizationContainer')).toBeVisible();
    await expect.poll(async () => await page.testSubj.locator('dashboardPanel').count()).toBe(2);
    // Add a Custom visualization panel and save it
    await pageObjects.dashboard.addNewPanel('Custom visualization');
    await pageObjects.dashboard.clickVisualizeSaveAndReturn();
    // Verify the Custom visualization panel is present and the previous two panels are still present
    await expect.poll(async () => await page.testSubj.locator('dashboardPanel').count()).toBe(3);
    // Save the dashboard
    await pageObjects.dashboard.saveDashboard(dashboardName);
    // Verify dashboard was saved
    const heading = page.testSubj.locator('breadcrumb last');
    await expect(heading).toHaveText('Editing ' + dashboardName);
  });

  test('edit existing dashboard and add map and custom visualization panels', async ({
    page,
    pageObjects,
  }) => {
    const logsDashboardTitle = '[Logs] Web Traffic';
    // Open the logs dashboard
    await pageObjects.dashboard.clickDashboardTitleLink(logsDashboardTitle);
    // validate the dashboard has 12 items before I start adding more
    await expect.poll(async () => await page.locator('.dshDashboardGrid__item').count()).toBe(12);
    // Switch to edit mode
    await pageObjects.dashboard.switchToEditMode();
    // Add a Map panel
    await pageObjects.dashboard.addNewPanel('Maps');
    // Add layer with documents from Kibana Sample Data Logs index
    await pageObjects.maps.addDocumentsLayer('Kibana Sample Data Logs');
    await expect.poll(async () => await page.locator('.dshDashboardGrid__item').count()).toBe(13);

    // Add a Custom visualization panel and save it
    await pageObjects.dashboard.addNewPanel('Custom visualization');
    await pageObjects.dashboard.clickVisualizeSaveAndReturn();
    await expect.poll(async () => await page.locator('.dshDashboardGrid__item').count()).toBe(14);
    // Save the dashboard
    await pageObjects.dashboard.saveChangesToExistingDashboard();
  });

  test('should duplicate an existing dashboard', async ({ page, pageObjects }) => {
    const logsDashboardTitle = '[Logs] Web Traffic';
    const duplicatedDashboardTitle = `${logsDashboardTitle} (1)`;

    await pageObjects.dashboard.clickDashboardTitleLink(logsDashboardTitle);

    const isInViewMode = await pageObjects.dashboard.getIsInViewMode();
    if (!isInViewMode) {
      await pageObjects.dashboard.clickCancelOutOfEditMode();
    }

    await pageObjects.dashboard.saveDashboard(duplicatedDashboardTitle);

    const heading = page.testSubj.locator('breadcrumb last');
    await expect(heading).toHaveText(duplicatedDashboardTitle);
  });

  test('Add Dashboard link type and URL link types to a dashboard', async ({
    page,
    pageObjects,
  }) => {
    const dashboardName = 'Test Dashboard with Links';
    // Open new dashboard
    await pageObjects.dashboard.openNewDashboard();
    // Add a Links panel (opens the panel editor flyout)
    await pageObjects.dashboard.addNewPanel('Links');
    await pageObjects.dashboardLinks.expectPanelEditorFlyoutIsOpen();
    // Add a Dashboard link pointing to the sample data dashboard
    await pageObjects.dashboardLinks.addDashboardLink('[Logs] Web Traffic');
    // Add an external URL link
    await pageObjects.dashboardLinks.addExternalLink('https://www.elastic.co', {
      linkLabel: 'Elastic Website',
    });
    // Save the links panel
    await pageObjects.dashboardLinks.clickPanelEditorSaveButton();
    // Verify the links panel is rendered with 2 links
    await expect.poll(() => pageObjects.dashboardLinks.getNumberOfLinksInPanel()).toBe(2);
    // Save the dashboard
    await pageObjects.dashboard.saveDashboard(dashboardName);
    // Verify dashboard was saved
    const heading = page.testSubj.locator('breadcrumb last');
    await expect(heading).toHaveText('Editing ' + dashboardName);
  });
  test('lens panel custom actions - explore in Discover', async ({ page, pageObjects }) => {
    const panelTitle = 'Test Lens Panel';
    const dashboardName = 'Test Dashboard Lens Panel Actions';

    await pageObjects.dashboard.openNewDashboard();

    await test.step('add a Lens panel with a title', async () => {
      await pageObjects.dashboard.addNewPanel('Lens');
      await pageObjects.lens.dragFieldToWorkspace('records');
      await pageObjects.lens.saveAndReturn();

      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelTitle(panelTitle);
      await pageObjects.dashboard.saveCustomizePanel();
    });

    await pageObjects.dashboard.saveDashboard(dashboardName);

    await test.step('click Explore in Discover and validate navigation', async () => {
      const newPagePromise = page.context().waitForEvent('page');
      await pageObjects.dashboard.clickPanelAction(
        'embeddablePanelAction-ACTION_OPEN_IN_DISCOVER',
        panelTitle
      );
      const discoverPage = await newPagePromise;
      await discoverPage.waitForLoadState();
      await expect(discoverPage.locator('[data-test-subj="unifiedHistogramChart"]')).toBeVisible();
      await discoverPage.close();
    });
    await test.step('save panel to library', async () => {
      await pageObjects.dashboard.saveToLibrary('Saved Lens Panel', panelTitle);
    });
  });
});
