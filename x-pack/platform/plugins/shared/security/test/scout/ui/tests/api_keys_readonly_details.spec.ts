/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { createApiKeyAsCurrentUser, invalidateApiKeysByName, test, testData } from '../fixtures';
import type { ApiKeysApp } from '../fixtures/page_objects';

const OWN_KEY_NAME = 'Happy API Key to View';
const EXPIRED_KEY_NAME = 'expired-key';
const OTHER_USER_KEY_NAME = 'other-key';

const ALL_KEY_NAMES = [OWN_KEY_NAME, EXPIRED_KEY_NAME, OTHER_USER_KEY_NAME];

const expectReadOnlyDetailsFlyout = async (apiKeys: ApiKeysApp, expectedStatus: string) => {
  await expect(apiKeys.flyoutTitle).toHaveText('API key details');
  await expect(apiKeys.nameInput).toBeHidden();
  await expect(apiKeys.keyStatus).toHaveText(expectedStatus);
  await expect(apiKeys.metadataSwitch).toBeDisabled();
  await expect(apiKeys.roleDescriptorsSwitch).toBeDisabled();
};

test.describe('API key read-only details flyout', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ esClient }) => {
    await invalidateApiKeysByName(esClient, ALL_KEY_NAMES);
  });

  test.afterEach(async ({ esClient }) => {
    await invalidateApiKeysByName(esClient, ALL_KEY_NAMES);
  });

  test('is read-only for a user who can only view API keys', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(testData.OWN_API_KEYS_ROLE);
    await createApiKeyAsCurrentUser(page, kbnUrl, {
      name: OWN_KEY_NAME,
      expiration: '1d',
      metadata: { name: 'metadatatest' },
      role_descriptors: testData.RESTRICTED_ROLE_DESCRIPTORS,
    });

    await browserAuth.loginWithCustomRole(testData.READ_SECURITY_ROLE);
    await pageObjects.apiKeys.goto();
    await pageObjects.apiKeys.openApiKey(OWN_KEY_NAME);

    await expectReadOnlyDetailsFlyout(pageObjects.apiKeys, 'Expires in a day');

    await pageObjects.apiKeys.cancelFlyout();
  });

  test('is read-only for an expired API key', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(testData.OWN_API_KEYS_ROLE);
    await createApiKeyAsCurrentUser(page, kbnUrl, { name: EXPIRED_KEY_NAME, expiration: '1ms' });
    await pageObjects.apiKeys.goto();
    await pageObjects.apiKeys.openApiKey(EXPIRED_KEY_NAME);

    await expectReadOnlyDetailsFlyout(pageObjects.apiKeys, 'Expired');

    await pageObjects.apiKeys.cancelFlyout();
  });

  test('is read-only for an API key owned by another user', async ({
    browserAuth,
    pageObjects,
    esClient,
  }) => {
    await esClient.security.createApiKey({ name: OTHER_USER_KEY_NAME, role_descriptors: {} });

    await browserAuth.loginWithCustomRole(testData.ALL_API_KEYS_ROLE);
    await pageObjects.apiKeys.goto();
    await pageObjects.apiKeys.openApiKey(OTHER_USER_KEY_NAME);

    await expectReadOnlyDetailsFlyout(pageObjects.apiKeys, 'Active');

    await pageObjects.apiKeys.cancelFlyout();
  });
});
