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
const DROPPED_FIELDS = ['bytes', 'clientip', 'extension', 'response'];

// Stable `data-test-subj` values reused across the suite.
const ESQL_EDITOR = 'ESQLEditor';
const METRIC_VIS = 'mtrVis';
const EDIT_FLYOUT_HEADER = 'editFlyoutHeader';
const CANCEL_FLYOUT_BUTTON = 'cancelFlyoutButton';
const PANEL_ACTION_EDIT = 'embeddablePanelAction-editPanel';

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
      await expect(page.testSubj.locator(ESQL_EDITOR)).toBeVisible();
      const defaultQuery = await pageObjects.discover.getEsqlQueryValue();
      expect(defaultQuery.trim().length).toBeGreaterThan(0);
    });

    await test.step('verify histogram and document grid are rendered for the sample query', async () => {
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await expect(page.testSubj.locator('unifiedHistogramRendered')).toBeVisible();
      await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
    });
  });

  test('should display a metric visualization for an ES|QL STATS query', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.discover.writeAndSubmitEsqlQuery(STATS_QUERY);

    await expect(page.testSubj.locator(METRIC_VIS)).toBeVisible();
  });

  test('should open the inline edit visualization flyout for an ES|QL chart', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.discover.writeAndSubmitEsqlQuery(STATS_QUERY);

    await test.step('open the edit visualization flyout', async () => {
      await page.testSubj.click('unifiedHistogramEditFlyoutVisualization');
      await expect(page.testSubj.locator(EDIT_FLYOUT_HEADER)).toBeVisible();
    });

    await test.step('verify the inline configuration panel is interactive', async () => {
      // The simplified inline editor for ES|QL viz no longer surfaces the legacy
      // `lns_colorEditing_trigger`; assert against stable controls in the
      // inline-edit flyout wrapper that are present for ES|QL panels.
      await expect(page.testSubj.locator('inlineEditingFlyoutLabel')).toBeVisible();
    });

    await test.step('close the flyout', async () => {
      await page.testSubj.click(CANCEL_FLYOUT_BUTTON);
      await expect(page.testSubj.locator(EDIT_FLYOUT_HEADER)).toBeHidden();
    });
  });

  test('should save an ES|QL visualization to a new dashboard from Discover', async ({
    pageObjects,
  }) => {
    const visName = 'ES|QL Stats Vis - New Dashboard';
    tracker.track({ type: 'lens', title: visName });
    tracker.track({ type: 'dashboard' });

    await pageObjects.discover.writeAndSubmitEsqlQuery(STATS_QUERY);

    await test.step('save the ES|QL visualization to a new dashboard', async () => {
      await pageObjects.discover.saveVisualizationToNewDashboard(visName);
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
      await pageObjects.discover.saveVisualizationToNewDashboard(visName);
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.dashboard.saveDashboard(dashboardName);
    });

    await test.step('edit the panel inline from the dashboard', async () => {
      // Saving an ES|QL viz from Discover lands the dashboard already in edit mode,
      // so only switch when the Edit button is actually present (view mode).
      await pageObjects.dashboard.ensureEditMode();
      await pageObjects.dashboard.clickPanelAction(PANEL_ACTION_EDIT, visName);
      await expect(page.testSubj.locator(EDIT_FLYOUT_HEADER)).toBeVisible();
      await page.testSubj.click(CANCEL_FLYOUT_BUTTON);
      await expect(page.testSubj.locator(EDIT_FLYOUT_HEADER)).toBeHidden();
    });

    await test.step('explore the panel in Discover and verify the ES|QL query is preserved', async () => {
      const newPagePromise = page.context().waitForEvent('page');
      await pageObjects.dashboard.clickPanelAction(
        'embeddablePanelAction-ACTION_OPEN_IN_DISCOVER',
        visName
      );
      const discoverPage = await newPagePromise;
      await discoverPage.waitForLoadState();
      await expect(discoverPage.getByTestId(ESQL_EDITOR)).toContainText('kibana_sample_data_logs');
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

    await expect(page.testSubj.locator(METRIC_VIS)).toBeVisible();
  });

  test('should restrict sidebar fields and grid columns to KEEP-listed fields', async ({
    pageObjects,
  }) => {
    await pageObjects.discover.writeAndSubmitEsqlQuery(KEEP_QUERY);

    await test.step('verify only KEEP-listed fields are present in the sidebar', async () => {
      await pageObjects.discover.expectSelectedSidebarFieldsToEqual(KEPT_FIELDS);
    });

    await test.step('verify the data grid only renders KEEP-listed columns', async () => {
      const headerText = await pageObjects.discover.getDocHeader();
      for (const field of KEPT_FIELDS) {
        expect(headerText).toContain(field);
      }
      for (const field of DROPPED_FIELDS) {
        expect(headerText).not.toContain(field);
      }
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
      await pageObjects.discover.expectXYVisChartVisible();
    });

    await test.step('save the histogram to a new dashboard', async () => {
      await pageObjects.discover.saveVisualizationToNewDashboard(visName);
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.dashboard.saveDashboard(dashboardName);
    });

    await test.step('edit the saved panel inline from the dashboard', async () => {
      // Saving an ES|QL viz from Discover lands the dashboard already in edit mode,
      // so only switch when the Edit button is actually present (view mode).
      await pageObjects.dashboard.ensureEditMode();
      await pageObjects.dashboard.clickPanelAction(PANEL_ACTION_EDIT, visName);
      await expect(page.testSubj.locator(EDIT_FLYOUT_HEADER)).toBeVisible();
      await page.testSubj.click(CANCEL_FLYOUT_BUTTON);
      await expect(page.testSubj.locator(EDIT_FLYOUT_HEADER)).toBeHidden();
    });
  });
});
