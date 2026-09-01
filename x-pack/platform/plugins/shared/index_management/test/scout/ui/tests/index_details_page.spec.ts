/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { NOT_SVL_SEARCH } from '../tags';

const testIndexName = `index-details-page-test-${randomUUID()}`;

// The a11y scans below are folded in as test.steps rather than a standalone
// a11y spec. They never open a modal/flyout/menu, so the app wrapper is the
// whole surface. (Migrated from x-pack accessibility/apps/group1/management.ts.)
const A11Y_SELECTORS = ['.kbnAppWrapper'];

// Excludes Search serverless: it has its own `search_indices` app for managing indices.
test.describe('Index details page', { tag: NOT_SVL_SEARCH }, () => {
  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.goto();
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: testIndexName }, { ignore: [404] });
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
    const { indexManagement } = pageObjects;

    await esClient.indices.create({ index: testIndexName });
    await indexManagement.navigateToIndexManagementTab('indices');
    await expect(indexManagement.indexLink(testIndexName)).toBeVisible({
      timeout: 30000,
    });

    await test.step('indices list has no a11y violations', async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await indexManagement.indexLink(testIndexName).click();
    await expect(page.testSubj.locator('indexDetailsContent')).toBeVisible();

    await test.step('overview, mappings, and settings tabs exist', async () => {
      await expect(page.testSubj.locator('indexDetailsTab-overview')).toBeVisible();
      await expect(page.testSubj.locator('indexDetailsTab-mappings')).toBeVisible();
      await expect(page.testSubj.locator('indexDetailsTab-settings')).toBeVisible();
    });

    await test.step('overview tab has no a11y violations', async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('mappings "Add field" button is enabled', async () => {
      await indexManagement.indexDetailsPage.changeTab('mappings');
      await expect(indexManagement.indexDetailsPage.mappingsAddFieldButton()).toBeEnabled();
    });

    await test.step('mappings tab has no a11y violations', async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('settings "Edit settings" switch is enabled', async () => {
      await indexManagement.indexDetailsPage.changeTab('settings');
      await expect(indexManagement.indexDetailsPage.editSettingsSwitch()).toBeEnabled();
    });

    await test.step('settings tab has no a11y violations', async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('settings tab in edit mode has no a11y violations', async () => {
      await indexManagement.indexDetailsPage.enableSettingsEditMode();
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('stats tab has no a11y violations', async () => {
      await indexManagement.indexDetailsPage.changeTab('stats');
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });
  });
});
