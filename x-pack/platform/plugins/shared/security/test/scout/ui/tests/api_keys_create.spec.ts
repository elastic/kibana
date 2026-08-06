/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { getCurrentUsername, invalidateApiKeysOwnedBy, test, testData } from '../fixtures';

const API_KEYS_URL = /app\/management\/security\/api_keys\/?$/;

test.describe('API keys creation', { tag: tags.stateful.classic }, () => {
  let currentUsername: string | undefined;
  test.beforeEach(async ({ browserAuth, page, kbnUrl, esClient, pageObjects }) => {
    currentUsername = undefined;
    await browserAuth.loginWithCustomRole(testData.OWN_API_KEYS_ROLE);
    currentUsername = await getCurrentUsername(page, kbnUrl);
    await invalidateApiKeysOwnedBy(esClient, currentUsername);
    await pageObjects.apiKeys.goto();
  });

  test.afterEach(async ({ esClient }) => {
    if (currentUsername) {
      await invalidateApiKeysOwnedBy(esClient, currentUsername);
    }
  });

  test('creates an API key from the empty prompt and shows it in the grid', async ({
    pageObjects,
    page,
  }) => {
    const apiKeyName = 'Happy API Key';
    const apiKeys = pageObjects.apiKeys;

    await expect(apiKeys.emptyPromptTitle).toHaveText('Create your first API key');

    await apiKeys.clickCreateFromPrompt();
    await expect(page).toHaveURL(/app\/management\/security\/api_keys\/create/);
    await expect(apiKeys.flyoutTitle).toHaveText('Create API key');

    await apiKeys.setName(apiKeyName);
    await apiKeys.submitFlyout();

    await expect(page).toHaveURL(API_KEYS_URL);
    await expect(apiKeys.createdCallOut).toContainText(`Created API key '${apiKeyName}'`);
    await expect(apiKeys.rowByName(apiKeyName)).toBeVisible();
  });

  test('creates an API key with a custom expiration', async ({ pageObjects, page }) => {
    const apiKeyName = 'Happy expiration API key';
    const apiKeys = pageObjects.apiKeys;

    await apiKeys.clickCreateFromPrompt();
    await expect(page).toHaveURL(/app\/management\/security\/api_keys\/create/);

    await apiKeys.setName(apiKeyName);
    await apiKeys.setCustomExpiration('12');
    await apiKeys.submitFlyout();

    await expect(page).toHaveURL(API_KEYS_URL);
    await expect(apiKeys.createdCallOut).toContainText(`Created API key '${apiKeyName}'`);
    await expect(apiKeys.rowByName(apiKeyName)).toBeVisible();

    await apiKeys.openApiKey(apiKeyName);
    await expect(apiKeys.keyStatus).toHaveText(/Expires in 1[12] days/);
    await apiKeys.cancelFlyout();
  });
});
