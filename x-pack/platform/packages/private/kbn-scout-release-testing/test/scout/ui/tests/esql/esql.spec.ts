/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, tags } from '@kbn/scout';
import { SavedObjectsTracker, installLogsSampleData, removeLogsSampleData } from '../../helpers';

const defaultSettings = {
  defaultIndex: 'kibana_sample_data_logs',
  'dateFormat:tz': 'UTC',
};

// Sample data for `kibana_sample_data_logs` is generated relative to the install
// time and spans roughly three weeks in the past and one week in the future, so
// a wide default time range guarantees the histogram and aggregations have data
// to render against.
const TIME_DEFAULTS = '{ "from": "now-3w", "to": "now+1w"}';

const STATS_QUERY = 'FROM kibana_sample_data_logs | LIMIT 10 | STATS varA = count(agent.keyword)';
const SUM_QUERY = 'FROM kibana_sample_data_logs | LIMIT 1000 | STATS total = sum(bytes)';
const KEEP_QUERY =
  'FROM kibana_sample_data_logs | LIMIT 1000 | KEEP agent.keyword, tags.keyword, geo.coordinates';
const HISTOGRAM_QUERY = 'FROM kibana_sample_data_logs | LIMIT 1000';

const KEPT_FIELDS = ['agent.keyword', 'tags.keyword', 'geo.coordinates'];

const tracker = new SavedObjectsTracker();

test.describe('Discover ES|QL', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await installLogsSampleData({ apiServices, kbnClient, settings: defaultSettings });
  });

  test.beforeEach(async ({ browserAuth, pageObjects, uiSettings }) => {
    await browserAuth.loginAsAdmin();
    await uiSettings.set({
      'timepicker:timeDefaults': TIME_DEFAULTS,
    });
    await pageObjects.discover.goto();
  });

  test.afterEach(async ({ kbnClient }) => {
    await tracker.cleanup(kbnClient);
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await removeLogsSampleData({ apiServices, kbnClient });
  });

  test('should switch the query bar to ES|QL and display the default sample query', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.discover.selectTextBaseLang();

    await test.step('verify ES|QL editor is active with a non-empty default query', async () => {
      await expect(page.testSubj.locator('ESQLEditor')).toBeVisible();
      const defaultQuery = await pageObjects.discover.getEsqlQueryValue();
      expect(defaultQuery.trim().length).toBeGreaterThan(0);
    });

    await test.step('verify document grid is rendered for the sample query', async () => {
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
    });
  });

  test('should display a metric visualization for an ES|QL STATS query', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.discover.writeAndSubmitEsqlQuery(STATS_QUERY);

    await expect(page.testSubj.locator('mtrVis')).toBeVisible();
  });

  test('should open the inline edit visualization flyout for an ES|QL chart', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.discover.writeAndSubmitEsqlQuery(STATS_QUERY);

    await test.step('open the edit visualization flyout', async () => {
      await page.testSubj.click('unifiedHistogramEditFlyoutVisualization');
      await expect(page.testSubj.locator('editFlyoutHeader')).toBeVisible();
    });

    await test.step('verify the inline configuration panel is interactive', async () => {
      // The simplified inline editor for ES|QL viz no longer surfaces the legacy
      // `lns_colorEditing_trigger`; assert against stable controls in the
      // inline-edit flyout wrapper that are present for ES|QL panels.
      await expect(page.testSubj.locator('inlineEditingFlyoutLabel')).toBeVisible();
      await expect(page.testSubj.locator('cancelFlyoutButton')).toBeEnabled();
    });

    await test.step('close the flyout', async () => {
      await page.testSubj.click('cancelFlyoutButton');
      await expect(page.testSubj.locator('editFlyoutHeader')).toBeHidden();
    });
  });

  test('should save an ES|QL visualization to a new dashboard from Discover', async ({
    page,
    pageObjects,
  }) => {
    const visName = 'ES|QL Stats Vis - New Dashboard';
    tracker.track({ type: 'lens', title: visName });
    tracker.track({ type: 'dashboard' });

    await pageObjects.discover.writeAndSubmitEsqlQuery(STATS_QUERY);

    await test.step('open the save visualization modal', async () => {
      await page.testSubj.click('unifiedHistogramSaveVisualization');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
    });

    await test.step('save to a new dashboard', async () => {
      await page.testSubj.fill('savedObjectTitle', visName);
      await page.locator('label[for="new-dashboard-option"]').click();
      await page.testSubj.click('confirmSaveSavedObjectButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
    });

    await test.step('verify Kibana navigated to the new dashboard with the panel', async () => {
      await pageObjects.dashboard.waitForRenderComplete();
      expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
    });
  });

  test('should edit, explore in Discover, and copy an ES|QL panel from a dashboard', async ({
    page,
    pageObjects,
  }) => {
    const dashboardName = 'ES|QL Panel Actions Dashboard';
    const visName = 'ES|QL Panel Actions Vis';
    tracker.track({ type: 'lens', title: visName });
    tracker.track({ type: 'dashboard', title: dashboardName });

    await test.step('save an ES|QL chart to a new dashboard', async () => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(STATS_QUERY);
      await page.testSubj.click('unifiedHistogramSaveVisualization');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
      await page.testSubj.fill('savedObjectTitle', visName);
      await page.locator('label[for="new-dashboard-option"]').click();
      await page.testSubj.click('confirmSaveSavedObjectButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.dashboard.saveDashboard(dashboardName);
    });

    await test.step('edit the panel inline from the dashboard', async () => {
      // Saving an ES|QL viz from Discover lands the dashboard already in edit mode,
      // so only switch when the Edit button is actually present (view mode).
      await pageObjects.dashboard.ensureEditMode();
      await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel', visName);
      await expect(page.testSubj.locator('editFlyoutHeader')).toBeVisible();
      await page.testSubj.click('cancelFlyoutButton');
      await expect(page.testSubj.locator('editFlyoutHeader')).toBeHidden();
    });

    await test.step('explore the panel in Discover and verify the ES|QL query is preserved', async () => {
      const newPagePromise = page.context().waitForEvent('page');
      await pageObjects.dashboard.clickPanelAction(
        'embeddablePanelAction-ACTION_OPEN_IN_DISCOVER',
        visName
      );
      const discoverPage = await newPagePromise;
      await discoverPage.waitForLoadState();
      await expect(discoverPage.locator('[data-test-subj="ESQLEditor"]')).toBeVisible();
      await expect(discoverPage.locator('[data-test-subj="ESQLEditor"]')).toContainText(
        'kibana_sample_data_logs'
      );
      await discoverPage.close();
    });

    await test.step('copy the panel to a new dashboard', async () => {
      await pageObjects.dashboard.clickPanelAction(
        'embeddablePanelAction-copyToDashboard',
        visName
      );
      const copyModal = page.locator('[role="dialog"][aria-labelledby="copyToDashboardTitle"]');
      await expect(copyModal).toBeVisible();
      // Clicking the EuiRadio wrapper does not toggle the underlying input
      // reliably; clicking the associated label does (same pattern as the
      // "save to a new dashboard" step above).
      await page.locator('label[for="new-dashboard-option"]').click();
      await expect(page.testSubj.locator('confirmCopyToButton')).toBeEnabled();
      await page.testSubj.click('confirmCopyToButton');

      await pageObjects.dashboard.waitForRenderComplete();
      expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
    });
  });

  test('should display a metric visualization for a sum() ES|QL query on sample data', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.discover.writeAndSubmitEsqlQuery(SUM_QUERY);

    await expect(page.testSubj.locator('mtrVis')).toBeVisible();
  });

  test('should restrict sidebar fields and grid columns to KEEP-listed fields', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.discover.writeAndSubmitEsqlQuery(KEEP_QUERY);

    await test.step('verify only KEEP-listed fields are present in the sidebar', async () => {
      await pageObjects.discover.waitUntilFieldListHasCountOfFields();
      // Kept fields render in both "Selected fields" and "Available fields" groups,
      // so scope to one group to avoid strict-mode locator violations.
      const availableFields = page.testSubj.locator('fieldListGroupedAvailableFields');
      for (const field of KEPT_FIELDS) {
        await expect(availableFields.getByTestId(`field-${field}`)).toBeVisible();
      }
      // Fields not present in the KEEP clause must be absent from the sidebar.
      const droppedFields = ['bytes', 'clientip', 'extension', 'response'];
      for (const field of droppedFields) {
        await expect(availableFields.getByTestId(`field-${field}`)).toHaveCount(0);
      }
    });

    await test.step('verify the data grid only renders KEEP-listed columns', async () => {
      const headerText = await pageObjects.discover.getDocHeader();
      for (const field of KEPT_FIELDS) {
        expect(headerText).toContain(field);
      }
      expect(headerText).not.toContain('bytes');
      expect(headerText).not.toContain('clientip');
    });
  });

  test('should save an ES|QL bar histogram to a dashboard and edit it inline', async ({
    page,
    pageObjects,
  }) => {
    const dashboardName = 'ES|QL Histogram Dashboard';
    const visName = 'ES|QL Histogram Vis';
    tracker.track({ type: 'lens', title: visName });
    tracker.track({ type: 'dashboard', title: dashboardName });

    await pageObjects.discover.writeAndSubmitEsqlQuery(HISTOGRAM_QUERY);

    await test.step('verify a histogram (xy chart) is rendered for the ES|QL query', async () => {
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
    });

    await test.step('save the histogram to a new dashboard', async () => {
      await page.testSubj.click('unifiedHistogramSaveVisualization');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
      await page.testSubj.fill('savedObjectTitle', visName);
      await page.locator('label[for="new-dashboard-option"]').click();
      await page.testSubj.click('confirmSaveSavedObjectButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.dashboard.saveDashboard(dashboardName);
    });

    await test.step('edit the saved panel inline from the dashboard', async () => {
      // Saving an ES|QL viz from Discover lands the dashboard already in edit mode,
      // so only switch when the Edit button is actually present (view mode).
      await pageObjects.dashboard.ensureEditMode();
      await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel', visName);
      await expect(page.testSubj.locator('editFlyoutHeader')).toBeVisible();
      await page.testSubj.click('cancelFlyoutButton');
      await expect(page.testSubj.locator('editFlyoutHeader')).toBeHidden();
    });
  });
});
