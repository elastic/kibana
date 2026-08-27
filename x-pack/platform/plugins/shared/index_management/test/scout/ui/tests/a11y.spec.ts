/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Accessibility sweep over the Index Management screens. The sibling specs
// already drive these screens functionally, so this file only adds the axe
// checks the FTR a11y suite used to provide.
//
// The FTR suite also scanned the indices list in its empty state, which it could
// rely on because it ran against a deployment where nothing had created an index
// yet. That is not reproducible here — the rest of this suite creates indices,
// and spec order is not guaranteed — so this file pins the populated state
// instead by creating an index of its own and asserting it is listed.
//
// FTR source: x-pack/platform/test/accessibility/apps/group1/management.ts
//             -> describe('index management')

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// Modals, flyouts, and context menus render in EUI portals outside .kbnAppWrapper.
const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

const testIndexName = `a11y-index-${Math.random().toString(36).slice(2)}`;

test.describe('Index Management - accessibility', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.indices.create({ index: testIndexName });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.goto();
  });

  test.afterAll(async ({ esClient, log }) => {
    try {
      await esClient.indices.delete({ index: testIndexName }, { ignore: [404] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      log.debug(`Index cleanup failed for ${testIndexName}: ${message}`);
    }
  });

  test('indices list has no a11y violations', async ({ page, pageObjects }) => {
    // Scanning a table with rows, not whichever state the deployment happens
    // to be in. The list can be slow to load under CI parallelism.
    await expect(pageObjects.indexManagement.indexLink(testIndexName)).toBeVisible({
      timeout: 30_000,
    });

    const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
    expect(violations).toStrictEqual([]);
  });

  test('index details tabs have no a11y violations', async ({ page, pageObjects }) => {
    const { indexManagement } = pageObjects;

    await expect(indexManagement.indexLink(testIndexName)).toBeVisible({ timeout: 30_000 });
    await indexManagement.indexLink(testIndexName).click();
    await indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();

    await test.step('overview', async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('settings', async () => {
      await indexManagement.indexDetailsPage.changeTab('settings');
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('settings in edit mode', async () => {
      await indexManagement.indexDetailsPage.enableSettingsEditMode();
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('mappings', async () => {
      await indexManagement.indexDetailsPage.changeTab('mappings');
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('stats', async () => {
      await indexManagement.indexDetailsPage.changeTab('stats');
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });
  });
});
