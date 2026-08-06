/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { createApiKeyAsCurrentUser, invalidateApiKeysByName, test, testData } from '../fixtures';

const API_KEY_NAME = 'Happy API Key to Update';
const METADATA_VALUE = '{"name":"metadataTest"}';

test.describe('API key update', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ esClient }) => {
    await invalidateApiKeysByName(esClient, [API_KEY_NAME]);
  });

  test.afterEach(async ({ esClient }) => {
    await invalidateApiKeysByName(esClient, [API_KEY_NAME]);
  });

  test('edits the metadata and privileges of an own API key', async ({
    browserAuth,
    pageObjects,
    page,
    kbnUrl,
  }) => {
    const apiKeys = pageObjects.apiKeys;
    const roleDescriptorsValue = JSON.stringify(testData.RESTRICTED_ROLE_DESCRIPTORS);

    await browserAuth.loginWithCustomRole(testData.OWN_API_KEYS_ROLE);
    await createApiKeyAsCurrentUser(page, kbnUrl, { name: API_KEY_NAME, expiration: '1d' });
    await apiKeys.goto();

    await test.step('open the key in an editable flyout', async () => {
      await apiKeys.openApiKey(API_KEY_NAME);

      await expect(apiKeys.flyoutTitle).toHaveText('Update API key');
      await expect(apiKeys.submitButton).toBeEnabled();
      await expect(apiKeys.nameInput).toBeHidden();
      await expect(apiKeys.keyStatus).toHaveText('Expires in a day');
      await expect(apiKeys.metadataSwitch).toBeEnabled();
      await expect(apiKeys.roleDescriptorsSwitch).toBeEnabled();
    });

    await test.step('both JSON editors start empty', async () => {
      await apiKeys.revealJsonEditors();

      expect(await apiKeys.getRoleDescriptorsValue()).toBe('{}');
      expect(await apiKeys.getMetadataValue()).toBe('{}');
    });

    await test.step('submitting the edited values reports success', async () => {
      await apiKeys.setRoleDescriptorsValue(roleDescriptorsValue);
      await apiKeys.setMetadataValue(METADATA_VALUE);

      expect(await apiKeys.getRoleDescriptorsValue()).toBe(roleDescriptorsValue);
      expect(await apiKeys.getMetadataValue()).toBe(METADATA_VALUE);

      await apiKeys.submitFlyout();

      await expect(apiKeys.updateSuccessToast).toContainText(`Updated API key '${API_KEY_NAME}'`);
      await expect(page).toHaveURL(/app\/management\/security\/api_keys\/?$/);
    });
  });
});
