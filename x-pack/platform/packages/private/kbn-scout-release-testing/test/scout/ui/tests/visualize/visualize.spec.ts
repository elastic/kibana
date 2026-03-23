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

  test('should create and save an aggregation-based visualization', async ({ page }) => {
    const visName = 'Test Agg-Based Metric Vis';
    createdArtifacts.push({ type: 'visualization', title: visName });

    await page.gotoApp('visualize');
    await expect(page.testSubj.locator('visualizationLandingPage')).toBeVisible();

    await test.step('open new visualization wizard', async () => {
      await page.testSubj.click('newItemButton');
      await expect(page.testSubj.locator('visNewDialogGroups')).toBeVisible();
    });

    await test.step('select aggregation-based metric visualization', async () => {
      await page.testSubj.click('groupModalLegacyTab');
      await page.testSubj.click('visType-aggbased');
      await expect(page.testSubj.locator('visNewDialogTypes')).toBeVisible();
      await page.testSubj.click('visType-metric');
    });

    await test.step('select data source', async () => {
      await page.testSubj.click('savedObjectTitlekibana_sample_data_logs');
    });

    await test.step('save the visualization to an existing dashboard', async () => {
      await page.testSubj.click('visualizeSaveButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
      await page.testSubj.locator('savedObjectTitle').fill(visName);
      await page.locator('label[for="existing-dashboard-option"]').click();
      await page.testSubj.click('open-dashboard-picker');
      await page.testSubj.locator('dashboard-picker-option-[Logs]-Web-Traffic').click();
      await page.testSubj.click('confirmSaveSavedObjectButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
    });
  });

  test('should create and save a Lens visualization', async ({ page }) => {
    const visName = 'Test Lens Visualization';
    createdArtifacts.push({ type: 'lens', title: visName });

    await page.gotoApp('visualize');
    await expect(page.testSubj.locator('visualizationLandingPage')).toBeVisible();

    await test.step('open Lens from new visualization wizard', async () => {
      await page.testSubj.click('newItemButton');
      await expect(page.testSubj.locator('visNewDialogGroups')).toBeVisible();
      await page.testSubj.click('visType-lens');
      await expect(page.testSubj.locator('lnsApp')).toBeVisible();
    });

    await test.step('configure Lens chart', async () => {
      const fieldLocator = page.testSubj.locator('lnsFieldListPanelField-___records___');
      const dropTarget = page.testSubj.locator('workspace-drag-drop-prompt');
      await fieldLocator.dragTo(dropTarget);
      await page.locator('.echCanvasRenderer').waitFor({ state: 'visible' });
    });

    await test.step('save the Lens visualization to an existing dashboard', async () => {
      await page.testSubj.click('lnsApp_saveButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
      await page.testSubj.locator('savedObjectTitle').fill(visName);
      await page.locator('label[for="existing-dashboard-option"]').click();
      await page.testSubj.click('open-dashboard-picker');
      await page.testSubj.locator('dashboard-picker-option-[Logs]-Web-Traffic').click();
      await page.testSubj.click('confirmSaveSavedObjectButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
    });
  });

  test('should create and save a custom visualization (Vega)', async ({ page }) => {
    const visName = 'Test Vega Visualization';
    createdArtifacts.push({ type: 'visualization', title: visName });

    await page.gotoApp('visualize');
    await expect(page.testSubj.locator('visualizationLandingPage')).toBeVisible();

    await test.step('open Vega editor from new visualization wizard', async () => {
      await page.testSubj.click('newItemButton');
      await expect(page.testSubj.locator('visNewDialogGroups')).toBeVisible();
      await page.testSubj.click('visType-vega');
    });

    await test.step('wait for Vega editor to load with default spec', async () => {
      await expect(page.testSubj.locator('visualizationLoader')).toBeVisible({ timeout: 30_000 });
    });

    await test.step('save the Vega visualization to an existing dashboard', async () => {
      await page.testSubj.click('visualizeSaveButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
      await page.testSubj.locator('savedObjectTitle').fill(visName);
      await page.locator('label[for="existing-dashboard-option"]').click();
      await page.testSubj.click('open-dashboard-picker');
      await page.testSubj.locator('dashboard-picker-option-[Logs]-Web-Traffic').click();
      await page.testSubj.click('confirmSaveSavedObjectButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
    });
  });

  test('should create and save a TSVB visualization', async ({ page }) => {
    const visName = 'Test TSVB Visualization';
    createdArtifacts.push({ type: 'visualization', title: visName });

    await page.gotoApp('visualize');
    await expect(page.testSubj.locator('visualizationLandingPage')).toBeVisible();

    await test.step('open TSVB from new visualization wizard', async () => {
      await page.testSubj.click('newItemButton');
      await expect(page.testSubj.locator('visNewDialogGroups')).toBeVisible();
      await page.testSubj.click('groupModalLegacyTab');
      await page.testSubj.click('visType-metrics');
    });

    await test.step('wait for TSVB editor to load', async () => {
      await expect(page.testSubj.locator('visualizationLoader')).toBeVisible({ timeout: 30_000 });
    });

    await test.step('save the TSVB visualization to an existing dashboard', async () => {
      await page.testSubj.click('visualizeSaveButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeVisible();
      await page.testSubj.locator('savedObjectTitle').fill(visName);
      await page.locator('label[for="existing-dashboard-option"]').click();
      await page.testSubj.click('open-dashboard-picker');
      await page.testSubj.locator('dashboard-picker-option-[Logs]-Web-Traffic').click();
      await page.testSubj.click('confirmSaveSavedObjectButton');
      await expect(page.testSubj.locator('savedObjectSaveModal')).toBeHidden();
    });
  });

  test('should export a visualization as PDF and download the report', async ({ page }) => {
    await test.step('open a sample data visualization', async () => {
      await page.gotoApp('visualize');
      await expect(page.testSubj.locator('visualizationLandingPage')).toBeVisible();
      await page.testSubj.click('visListingTitleLink-[Logs]-Visitors-Map');
      await expect(page.testSubj.locator('visualizationLoader')).toBeVisible({ timeout: 30_000 });
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
