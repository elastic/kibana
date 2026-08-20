/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import {
  createApiKeyAsCurrentUser,
  getCurrentUsername,
  invalidateApiKeysOwnedBy,
  test,
  testData,
} from '../fixtures';

const PAGE_SIZE = 25;
// Well clear of one page: batch-seeded keys share creation timestamps, and the grid's exclusive
// `search_after` cursor drops tied rows, so page 2 needs slack to stay non-empty.
const KEY_COUNT = 40;
const KEY_PREFIX = 'pagination-test-key';
const SEED_BATCH_SIZE = 10;

test.describe('API keys grid pagination', { tag: tags.stateful.classic }, () => {
  let currentUsername: string | undefined;
  test.beforeEach(async ({ browserAuth, page, kbnUrl, esClient }) => {
    currentUsername = undefined;
    await browserAuth.loginWithCustomRole(testData.OWN_API_KEYS_ROLE);
    currentUsername = await getCurrentUsername(page, kbnUrl);
    await invalidateApiKeysOwnedBy(esClient, currentUsername);

    for (let batch = 0; batch < KEY_COUNT / SEED_BATCH_SIZE; batch++) {
      await Promise.all(
        Array.from({ length: SEED_BATCH_SIZE }, (_, offset) => {
          const index = batch * SEED_BATCH_SIZE + offset;
          return createApiKeyAsCurrentUser(page, kbnUrl, {
            name: `${KEY_PREFIX}-${index.toString().padStart(2, '0')}`,
          });
        })
      );
    }
  });

  test.afterEach(async ({ esClient }) => {
    if (currentUsername) {
      await invalidateApiKeysOwnedBy(esClient, currentUsername);
    }
  });

  test('pages through the full key set with the searchAfter cursor', async ({ pageObjects }) => {
    const apiKeys = pageObjects.apiKeys;
    let firstPage: string[] = [];

    await apiKeys.goto();
    await apiKeys.waitForTableLoaded();

    await test.step('the first page fills up and cannot go back', async () => {
      await expect(apiKeys.anyRowName).toHaveCount(PAGE_SIZE);
      firstPage = await apiKeys.visibleApiKeyNames();

      await expect(apiKeys.previousPageButton).toBeDisabled();
      await expect(apiKeys.nextPageButton).toBeEnabled();
    });

    await test.step('the last page holds different keys and cannot go forward', async () => {
      await apiKeys.goToNextPage();
      // Both paging buttons are also disabled while the fetch is in flight, and the table keeps the
      // previous rows until it resolves, so a vanished row is the only reliable page-turn signal.
      await expect(apiKeys.rowByName(firstPage[0])).toBeHidden();

      const secondPage = await apiKeys.visibleApiKeyNames();
      expect(secondPage.length).toBeGreaterThan(0);
      expect(secondPage.filter((name) => firstPage.includes(name))).toStrictEqual([]);

      await expect(apiKeys.previousPageButton).toBeEnabled();
      await expect(apiKeys.nextPageButton).toBeDisabled();
    });

    await test.step('going back restores the first page', async () => {
      await apiKeys.goToPreviousPage();
      await expect(apiKeys.rowByName(firstPage[0])).toBeVisible();

      await expect(apiKeys.anyRowName).toHaveCount(PAGE_SIZE);
      expect(await apiKeys.visibleApiKeyNames()).toStrictEqual(firstPage);

      await expect(apiKeys.previousPageButton).toBeDisabled();
      await expect(apiKeys.nextPageButton).toBeEnabled();
    });
  });
});
