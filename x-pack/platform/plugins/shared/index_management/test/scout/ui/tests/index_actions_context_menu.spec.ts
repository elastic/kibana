/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { NOT_SVL_SEARCH } from '../tags';

const testIndexName = `index-context-menu-test-${Math.random()}`;
const createdIndexName = `index-context-menu-created-test-${Math.random()}`;

// Excludes Search serverless: it has its own `search_indices` app for managing indices.
test.describe('Index actions context menu', { tag: NOT_SVL_SEARCH }, () => {
  test.beforeEach(async ({ esClient, browserAuth, pageObjects }) => {
    await esClient.indices.delete({ index: testIndexName }, { ignore: [404] });
    await esClient.indices.create({ index: testIndexName });
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('indices');
  });

  test.afterEach(async ({ esClient, log }) => {
    for (const index of [testIndexName, createdIndexName]) {
      try {
        await esClient.indices.delete({ index }, { ignore: [404] });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        log.debug(`Index cleanup failed for ${index}: ${message}`);
      }
    }
  });

  test('can create an index', async ({ pageObjects }) => {
    await pageObjects.indexManagement.clickCreateIndexButton();
    await pageObjects.indexManagement.setCreateIndexName(createdIndexName);
    await pageObjects.indexManagement.clickCreateIndexSaveButton();
    await expect(pageObjects.indexManagement.indexLink(createdIndexName)).toBeVisible({
      timeout: 30000,
    });
  });

  test('navigates to overview, settings, and mappings tabs from the manage index menu', async ({
    page,
    pageObjects,
  }) => {
    await test.step('manage index menu shows the expected actions', async () => {
      await pageObjects.indexManagement.manageIndex(testIndexName);
      await expect(page.testSubj.locator('showOverviewIndexMenuButton')).toBeVisible();
      await expect(page.testSubj.locator('showSettingsIndexMenuButton')).toBeVisible();
      await expect(page.testSubj.locator('showMappingsIndexMenuButton')).toBeVisible();
      await expect(page.testSubj.locator('deleteIndexMenuButton')).toBeVisible();
    });

    await test.step('navigates to the overview tab', async () => {
      await pageObjects.indexManagement.changeManageIndexTab('showOverviewIndexMenuButton');
      await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
      expect(page.url()).toContain('tab=overview');
    });

    await test.step('navigates to the settings tab', async () => {
      await pageObjects.indexManagement.navigateToIndexManagementTab('indices');
      await pageObjects.indexManagement.manageIndex(testIndexName);
      await pageObjects.indexManagement.changeManageIndexTab('showSettingsIndexMenuButton');
      await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
      expect(page.url()).toContain('tab=settings');
    });

    await test.step('navigates to the mappings tab', async () => {
      await pageObjects.indexManagement.navigateToIndexManagementTab('indices');
      await pageObjects.indexManagement.manageIndex(testIndexName);
      await pageObjects.indexManagement.changeManageIndexTab('showMappingsIndexMenuButton');
      await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
      expect(page.url()).toContain('tab=mappings');
    });
  });

  test('can delete an index from the manage index menu', async ({ page, pageObjects }) => {
    await pageObjects.indexManagement.manageIndex(testIndexName);
    await pageObjects.indexManagement.deleteIndexFromContextMenu();

    await expect(page.testSubj.locator('confirmModalTitleText')).toHaveText('Delete index');
    await pageObjects.indexManagement.confirmDeleteIndexModal();

    await expect(pageObjects.indexManagement.indexLink(testIndexName)).toBeHidden();
  });
});
