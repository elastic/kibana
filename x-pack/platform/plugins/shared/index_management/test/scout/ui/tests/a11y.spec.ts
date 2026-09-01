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

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// This suite only scans the in-app content (list + details tabs); it never opens
// a modal, flyout, or context menu, so the app wrapper is the whole surface.
const A11Y_SELECTORS = ['.kbnAppWrapper'];

const testIndexName = `a11y-index-${randomUUID()}`;

test.describe('Index Management - accessibility', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.indices.create({ index: testIndexName });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.goto();
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: testIndexName }, { ignore: [404] });
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
