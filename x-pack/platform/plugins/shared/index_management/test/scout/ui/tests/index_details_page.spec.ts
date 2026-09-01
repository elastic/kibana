/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { NOT_SVL_SEARCH } from '../tags';

const testIndexName = `index-details-page-test-${Math.random()}`;

// Excludes Search serverless: it has its own `search_indices` app for managing indices.
test.describe('Index details page', { tag: NOT_SVL_SEARCH }, () => {
  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.goto();
  });

  test.afterEach(async ({ esClient, log }) => {
    try {
      await esClient.indices.delete({ index: testIndexName }, { ignore: [404] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      log.debug(`Index cleanup failed for ${testIndexName}: ${message}`);
    }
  });

  test('Navigates to the index details page from the home page', async ({ pageObjects, log }) => {
    await log.debug('Navigating to the index details page');

    // Display hidden indices to have some rows in the indices table
    await pageObjects.indexManagement.toggleHiddenIndices();

    // Click the first index in the table and wait for the index details page
    await pageObjects.indexManagement.openIndexDetailsPage(0);

    // Verify index details page is loaded
    await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
  });

  test('Shows enabled mappings and settings actions for a fresh index', async ({
    pageObjects,
    esClient,
    page,
  }) => {
    await esClient.indices.create({ index: testIndexName });
    await pageObjects.indexManagement.navigateToIndexManagementTab('indices');
    await expect(pageObjects.indexManagement.indexLink(testIndexName)).toBeVisible({
      timeout: 30000,
    });
    await pageObjects.indexManagement.indexLink(testIndexName).click();
    await expect(page.testSubj.locator('indexDetailsContent')).toBeVisible();

    await test.step('overview, mappings, and settings tabs exist', async () => {
      await expect(page.testSubj.locator('indexDetailsTab-overview')).toBeVisible();
      await expect(page.testSubj.locator('indexDetailsTab-mappings')).toBeVisible();
      await expect(page.testSubj.locator('indexDetailsTab-settings')).toBeVisible();
    });

    await test.step('mappings "Add field" button is enabled', async () => {
      await pageObjects.indexManagement.indexDetailsPage.changeTab('indexDetailsTab-mappings');
      await expect(
        pageObjects.indexManagement.indexDetailsPage.mappingsAddFieldButton()
      ).toBeEnabled();
    });

    await test.step('settings "Edit settings" switch is enabled', async () => {
      await pageObjects.indexManagement.indexDetailsPage.changeTab('indexDetailsTab-settings');
      await expect(pageObjects.indexManagement.indexDetailsPage.editSettingsSwitch()).toBeEnabled();
    });
  });
});
