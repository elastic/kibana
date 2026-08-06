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

// The grid pages at 25 rows, so 30 keys guarantees exactly two pages.
const PAGE_SIZE = 25;
const KEY_COUNT = 30;
const KEY_PREFIX = 'pagination-test-key';
const SEED_BATCH_SIZE = 10;

// Owner-scoped cleanup, resolved once while the session is known good so `afterEach` never has to
// touch a browser that may have just died mid-test.
let currentUsername: string | undefined;

test.describe('API keys grid pagination', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, page, kbnUrl, esClient }) => {
    currentUsername = undefined;
    await browserAuth.loginWithCustomRole(testData.OWN_API_KEYS_ROLE);
    currentUsername = await getCurrentUsername(page, kbnUrl);
    await invalidateApiKeysOwnedBy(esClient, currentUsername);

    // Batched rather than serial: each create is a full browser->Kibana->ES round trip against a
    // refresh-on-write index, and 30 of them in sequence consumed over half of Playwright's 60s
    // per-test budget (hooks share it) on a warm local stack alone.
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

  // The prev/next disabled states are already covered against mocked data by
  // api_keys_grid_page.test.tsx. What only an end-to-end test can show is that the `searchAfter`
  // cursor really fetches a second, disjoint page from Elasticsearch and that going back restores
  // the first one — so that, not the button state, is what this test leads with.
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
      await expect(apiKeys.nextPageButton).toBeDisabled();

      // Deliberately not an exact row count. The grid sorts on `creation` with no tie-breaker and
      // pages with an exclusive `search_after` cursor, so two keys created in the same millisecond
      // can legitimately cost page 2 a row. Disjointness is the property this test is about.
      const secondPage = await apiKeys.visibleApiKeyNames();
      expect(secondPage.length).toBeGreaterThan(0);
      expect(secondPage.filter((name) => firstPage.includes(name))).toStrictEqual([]);

      await expect(apiKeys.previousPageButton).toBeEnabled();
    });

    await test.step('going back restores the first page', async () => {
      await apiKeys.goToPreviousPage();

      await expect(apiKeys.anyRowName).toHaveCount(PAGE_SIZE);
      expect(await apiKeys.visibleApiKeyNames()).toStrictEqual(firstPage);

      await expect(apiKeys.previousPageButton).toBeDisabled();
      await expect(apiKeys.nextPageButton).toBeEnabled();
    });
  });
});
