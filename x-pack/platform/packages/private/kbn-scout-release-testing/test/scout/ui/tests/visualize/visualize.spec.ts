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

const defaultSettings = {
  defaultIndex: 'kibana_sample_data_logs',
  'dateFormat:tz': 'UTC',
};

const SAMPLE_DASHBOARD = '[Logs] Web Traffic';

let downloadedFilePath: string | null = null;

const createdArtifacts: Array<{ type: string; title?: string }> = [];

test.describe('Visualize app', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await apiServices.sampleData.install('logs');
    await kbnClient.uiSettings.update(defaultSettings);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ kbnClient }) => {
    if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
      fs.unlinkSync(downloadedFilePath);
      downloadedFilePath = null;
    }

    if (createdArtifacts.length > 0) {
      const uniqueTypes = [...new Set(createdArtifacts.map((a) => a.type))];
      for (const type of uniqueTypes) {
        const response = await kbnClient.savedObjects.find<{ title: string }>({ type });
        const artifactsOfType = createdArtifacts.filter((a) => a.type === type);
        const cleanAll = artifactsOfType.some((a) => !a.title);

        const objectsToDelete = cleanAll
          ? response.saved_objects
          : response.saved_objects.filter((so) =>
              artifactsOfType.some((a) => a.title === so.attributes.title)
            );

        if (objectsToDelete.length > 0) {
          await kbnClient.savedObjects.bulkDelete({
            objects: objectsToDelete.map((so) => ({ type: so.type, id: so.id })),
          });
        }
      }
      createdArtifacts.length = 0;
    }
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await apiServices.sampleData.remove('logs');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should create and save an aggregation-based visualization', async ({ pageObjects }) => {
    const visName = 'Test Agg-Based Metric Vis';
    createdArtifacts.push({ type: 'visualization', title: visName });

    await pageObjects.visualize.goto();

    await test.step('select aggregation-based metric visualization', async () => {
      await pageObjects.visualize.openNewVisualizationWizard();
      await pageObjects.visualize.clickAggBasedType('metric');
    });

    await test.step('select data source', async () => {
      await pageObjects.visualize.selectDataSource('kibana_sample_data_logs');
    });

    await test.step('save the visualization to an existing dashboard', async () => {
      await pageObjects.visualize.saveToExistingDashboard(visName, SAMPLE_DASHBOARD);
    });
  });

  test('should create and save a Lens visualization', async ({ page, pageObjects }) => {
    const visName = 'Test Lens Visualization';
    createdArtifacts.push({ type: 'lens', title: visName });

    await pageObjects.visualize.goto();

    await test.step('open Lens from new visualization wizard', async () => {
      await pageObjects.visualize.openNewVisualizationWizard();
      await pageObjects.visualize.clickVisType('lens');
      await expect(page.testSubj.locator('lnsApp')).toBeVisible();
    });

    await test.step('configure Lens chart', async () => {
      await pageObjects.lens.dragFieldToWorkspace('records');
    });

    await test.step('save the Lens visualization to an existing dashboard', async () => {
      await page.testSubj.click('lnsApp_saveButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
      await page.testSubj.locator('savedObjectTitle').fill(visName);
      await pageObjects.visualize.selectExistingDashboard(SAMPLE_DASHBOARD);
      await page.testSubj.click('confirmSaveSavedObjectButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
    });
  });

  test('should create and save a custom visualization (Vega)', async ({ pageObjects }) => {
    const visName = 'Test Vega Visualization';
    createdArtifacts.push({ type: 'visualization', title: visName });

    await pageObjects.visualize.goto();

    await test.step('open Vega editor from new visualization wizard', async () => {
      await pageObjects.visualize.openNewVisualizationWizard();
      await pageObjects.visualize.clickVisType('vega');
    });

    await test.step('wait for Vega editor to load with default spec', async () => {
      await pageObjects.visualize.waitForVisualizationLoaded();
    });

    await test.step('save the Vega visualization to an existing dashboard', async () => {
      await pageObjects.visualize.saveToExistingDashboard(visName, SAMPLE_DASHBOARD);
    });
  });

  test('should create and save a TSVB visualization', async ({ pageObjects }) => {
    const visName = 'Test TSVB Visualization';
    createdArtifacts.push({ type: 'visualization', title: visName });

    await pageObjects.visualize.goto();

    await test.step('open TSVB from new visualization wizard', async () => {
      await pageObjects.visualize.openNewVisualizationWizard();
      await pageObjects.visualize.clickLegacyTab();
      await pageObjects.visualize.clickVisType('metrics');
    });

    await test.step('wait for TSVB editor to load', async () => {
      await pageObjects.visualize.waitForVisualizationLoaded();
    });

    await test.step('save the TSVB visualization to an existing dashboard', async () => {
      await pageObjects.visualize.saveToExistingDashboard(visName, SAMPLE_DASHBOARD);
    });
  });

  test('should create a TSVB visualization and save it to a new dashboard', async ({
    page,
    pageObjects,
  }) => {
    const visName = 'Test TSVB New Dashboard Vis';
    const dashboardName = 'TSVB New Dashboard';
    createdArtifacts.push({ type: 'visualization', title: visName });
    createdArtifacts.push({ type: 'dashboard', title: dashboardName });

    await pageObjects.visualize.goto();

    await test.step('open TSVB from new visualization wizard', async () => {
      await pageObjects.visualize.openNewVisualizationWizard();
      await pageObjects.visualize.clickLegacyTab();
      await pageObjects.visualize.clickVisType('metrics');
    });

    await test.step('wait for TSVB editor to load', async () => {
      await pageObjects.visualize.waitForVisualizationLoaded();
    });

    await test.step('save the TSVB visualization to a new dashboard', async () => {
      await pageObjects.visualize.saveToNewDashboard(visName);
    });

    await test.step('verify redirected to new dashboard with the panel', async () => {
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.dashboard.expectPanelCount(1);
    });

    await test.step('save the new dashboard', async () => {
      await pageObjects.dashboard.saveDashboard(dashboardName);
    });

    await test.step('verify dashboard is saved', async () => {
      const heading = page.testSubj.locator('breadcrumb last');
      await expect(heading).toHaveText('Editing ' + dashboardName);
    });
  });

  test('should export a visualization as PDF and download the report', async ({
    page,
    pageObjects,
  }) => {
    await test.step('open a sample data visualization', async () => {
      await pageObjects.visualize.goto();
      await pageObjects.visualize.openSavedVisualization('[Logs] Visitors Map');
    });

    await test.step('trigger PDF export from share menu', async () => {
      await page.testSubj.click('exportTopNavButton');
      await expect(page.testSubj.locator('exportMenuItem-PDF')).toBeVisible();
      await page.testSubj.click('exportMenuItem-PDF');
      await expect(page.testSubj.locator('exportItemDetailsFlyout')).toBeVisible();
      await page.testSubj.click('generateReportButton');
    });

    await test.step('wait for report to be queued', async () => {
      await expect(page.testSubj.locator('queueReportSuccess')).toBeVisible({
        timeout: 60_000,
      });
    });

    await test.step('wait for report completion and download', async () => {
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
});
