/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, tags } from '@kbn/scout';
import fs from 'fs';
import os from 'os';
import {
  ArtifactTracker,
  cleanupDownloadedFile,
  installLogsSampleData,
  removeLogsSampleData,
} from '../../helpers';

const defaultSettings = {
  defaultIndex: 'kibana_sample_data_logs',
  'dateFormat:tz': 'UTC',
};

const SAMPLE_DASHBOARD = '[Logs] Web Traffic';
const SAMPLE_DASHBOARD_PANEL_COUNT = 12;

const tracker = new ArtifactTracker();
let downloadedFilePath: string | null = null;

test.describe('Visualize app', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await installLogsSampleData({ apiServices, kbnClient, settings: defaultSettings });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ kbnClient }) => {
    downloadedFilePath = cleanupDownloadedFile(downloadedFilePath);
    await tracker.cleanup(kbnClient);
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await removeLogsSampleData({ apiServices, kbnClient });
  });

  test('should create and save an aggregation-based visualization', async ({ pageObjects }) => {
    tracker.track({ type: 'visualization', title: 'Test Agg-Based Metric Vis' });

    await pageObjects.visualize.createAggBasedVisualization('metric', 'kibana_sample_data_logs');
    await pageObjects.visualize.saveToExistingDashboard(
      'Test Agg-Based Metric Vis',
      SAMPLE_DASHBOARD
    );
    await pageObjects.dashboard.waitForRenderComplete();
    expect(await pageObjects.dashboard.getPanelCount()).toBe(SAMPLE_DASHBOARD_PANEL_COUNT + 1);
  });

  test('should create and save a Lens visualization', async ({ page, pageObjects }) => {
    tracker.track({ type: 'lens', title: 'Test Lens Visualization' });

    await pageObjects.visualize.goto();
    await pageObjects.visualize.openNewVisualizationWizard();
    await pageObjects.visualize.clickVisType('lens');
    await expect(page.testSubj.locator('lnsApp')).toBeVisible();
    await pageObjects.lens.dragFieldToWorkspace('records');

    await page.testSubj.click('lnsApp_saveButton');
    await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
    await page.testSubj.locator('savedObjectTitle').fill('Test Lens Visualization');
    await pageObjects.visualize.selectExistingDashboard(SAMPLE_DASHBOARD);
    await page.testSubj.click('confirmSaveSavedObjectButton');
    await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();

    await pageObjects.dashboard.waitForRenderComplete();
    expect(await pageObjects.dashboard.getPanelCount()).toBe(SAMPLE_DASHBOARD_PANEL_COUNT + 1);
  });

  test('should create and save a custom visualization (Vega)', async ({ pageObjects }) => {
    tracker.track({ type: 'visualization', title: 'Test Vega Visualization' });

    await pageObjects.visualize.createVegaVisualization();
    await pageObjects.visualize.saveToExistingDashboard(
      'Test Vega Visualization',
      SAMPLE_DASHBOARD
    );
    await pageObjects.dashboard.waitForRenderComplete();
    expect(await pageObjects.dashboard.getPanelCount()).toBe(SAMPLE_DASHBOARD_PANEL_COUNT + 1);
  });

  test('should create and save a TSVB visualization', async ({ pageObjects }) => {
    tracker.track({ type: 'visualization', title: 'Test TSVB Visualization' });

    await pageObjects.visualize.createTSVBVisualization();
    await pageObjects.visualize.saveToExistingDashboard(
      'Test TSVB Visualization',
      SAMPLE_DASHBOARD
    );
    await pageObjects.dashboard.waitForRenderComplete();
    expect(await pageObjects.dashboard.getPanelCount()).toBe(SAMPLE_DASHBOARD_PANEL_COUNT + 1);
  });

  test('should create a TSVB visualization and save it to a new dashboard', async ({
    page,
    pageObjects,
  }) => {
    const dashboardName = 'TSVB New Dashboard';
    tracker.track({ type: 'visualization', title: 'Test TSVB New Dashboard Vis' });
    tracker.track({ type: 'dashboard', title: dashboardName });

    await pageObjects.visualize.createTSVBVisualization();
    await pageObjects.visualize.saveToNewDashboard('Test TSVB New Dashboard Vis');

    await pageObjects.dashboard.waitForRenderComplete();
    expect(await pageObjects.dashboard.getPanelCount()).toBe(1);

    await pageObjects.dashboard.saveDashboard(dashboardName);
    const heading = page.testSubj.locator('breadcrumb last');
    await expect(heading).toHaveText('Editing ' + dashboardName);
  });

  test('should export a visualization as PDF and download the report', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.visualize.goto();
    await pageObjects.visualize.openSavedVisualization('[Logs] Visitors Map');

    await page.testSubj.click('exportTopNavButton');
    await expect(page.testSubj.locator('exportMenuItem-PDF')).toBeVisible();
    await page.testSubj.click('exportMenuItem-PDF');
    await expect(page.testSubj.locator('exportItemDetailsFlyout')).toBeVisible();
    await page.testSubj.click('generateReportButton');

    await expect(page.testSubj.locator('queueReportSuccess')).toBeVisible({ timeout: 60_000 });

    const downloadButton = page.testSubj.locator('downloadCompletedReportButton');
    await expect(downloadButton).toBeVisible({ timeout: 120_000 });
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;

    downloadedFilePath = `${os.tmpdir()}/${download.suggestedFilename()}`;
    await download.saveAs(downloadedFilePath);

    expect(fs.existsSync(downloadedFilePath)).toBe(true);
    const stats = fs.statSync(downloadedFilePath);
    expect(stats.size).toBeGreaterThan(0);
  });
});
