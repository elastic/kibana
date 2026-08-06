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

// Owner-scoped rather than name-scoped cleanup: both tests assert the empty prompt, which requires
// this user to own no keys at all. Resolved once in `beforeEach` while the session is known good.
let currentUsername: string | undefined;

test.describe('API keys deletion', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, page, kbnUrl, esClient }) => {
    currentUsername = undefined;
    await browserAuth.loginWithCustomRole(testData.OWN_API_KEYS_ROLE);
    currentUsername = await getCurrentUsername(page, kbnUrl);
    await invalidateApiKeysOwnedBy(esClient, currentUsername);
  });

  test.afterEach(async ({ esClient }) => {
    if (currentUsername) {
      await invalidateApiKeysOwnedBy(esClient, currentUsername);
    }
  });

  test('deletes an API key from its table row', async ({ pageObjects, page, kbnUrl }) => {
    const apiKeyName = 'api key 1';
    const apiKeys = pageObjects.apiKeys;

    await createApiKeyAsCurrentUser(page, kbnUrl, { name: apiKeyName });
    await apiKeys.goto();
    await expect(apiKeys.rowByName(apiKeyName)).toBeVisible();

    await apiKeys.deleteApiKey(apiKeyName);

    await expect(apiKeys.emptyPromptTitle).toHaveText('Create your first API key');
  });

  test('deletes all API keys at once with the bulk action', async ({
    pageObjects,
    page,
    kbnUrl,
  }) => {
    const apiKeys = pageObjects.apiKeys;

    await createApiKeyAsCurrentUser(page, kbnUrl, { name: 'api key 1' });
    await apiKeys.goto();
    await expect(apiKeys.rowByName('api key 1')).toBeVisible();

    // The second key goes through the grid's toolbar button rather than the API: it is the only
    // coverage of `apiKeysCreateTableButton`, which is the create path every user with at least one
    // existing key takes (the empty-prompt button is unreachable for them).
    await apiKeys.clickCreateFromTable();
    await apiKeys.setName('api key 2');
    await apiKeys.submitFlyout();
    await expect(apiKeys.rowByName('api key 2')).toBeVisible();

    await apiKeys.bulkDeleteAllApiKeys();

    await expect(apiKeys.emptyPromptTitle).toHaveText('Create your first API key');
  });
});
