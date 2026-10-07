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
  invalidateApiKeysByName,
  resolveApiKeyOwner,
  test,
  testData,
} from '../fixtures';

const CROSS_CLUSTER_KEY = 'test_cross_cluster';
const MANAGED_BY_METADATA_KEY = 'my api key';
const MANAGED_BY_NAME_KEY = 'Alerting: Managed';
const EXPIRED_KEY = 'test_api_key';
const OWN_KEY = 'test_user_api_key';

const SEEDED_KEYS = [CROSS_CLUSTER_KEY, MANAGED_BY_METADATA_KEY, MANAGED_BY_NAME_KEY, EXPIRED_KEY];

test.describe('API keys grid filtering', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await invalidateApiKeysByName(esClient, SEEDED_KEYS);

    await esClient.transport.request({
      method: 'POST',
      path: '/_security/cross_cluster/api_key',
      body: {
        name: CROSS_CLUSTER_KEY,
        expiration: '1d',
        access: {
          search: [{ names: ['*'] }],
          replication: [{ names: ['*'] }],
        },
      },
    });

    await esClient.security.createApiKey({
      name: MANAGED_BY_METADATA_KEY,
      expiration: '1d',
      role_descriptors: { role_1: {} },
      metadata: { managed: true },
    });

    await esClient.security.createApiKey({
      name: MANAGED_BY_NAME_KEY,
      expiration: '1d',
      role_descriptors: { role_1: {} },
    });

    await esClient.security.createApiKey({
      name: EXPIRED_KEY,
      expiration: '1ms',
      role_descriptors: { role_1: {} },
    });
  });

  test.beforeEach(async ({ browserAuth, page, kbnUrl, esClient, pageObjects }) => {
    await browserAuth.loginWithCustomRole(testData.ALL_API_KEYS_ROLE);
    await invalidateApiKeysByName(esClient, [OWN_KEY]);
    await createApiKeyAsCurrentUser(page, kbnUrl, { name: OWN_KEY, expiration: '1d' });
    await pageObjects.apiKeys.goto();
    await pageObjects.apiKeys.waitForTableLoaded();
  });

  test.afterEach(async ({ esClient }) => {
    await invalidateApiKeysByName(esClient, [OWN_KEY]);
  });

  test.afterAll(async ({ esClient }) => {
    await invalidateApiKeysByName(esClient, SEEDED_KEYS);
  });

  test('shows only rest-type keys before any filter is touched', async ({ pageObjects }) => {
    const apiKeys = pageObjects.apiKeys;

    await expect(apiKeys.rowByName(OWN_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(EXPIRED_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(CROSS_CLUSTER_KEY)).toBeHidden();
  });

  test('wires the type and expiry filter buttons to the grid query', async ({ pageObjects }) => {
    const apiKeys = pageObjects.apiKeys;

    await test.step('clearing the default Personal filter shows every type', async () => {
      await apiKeys.toggleTypeFilter('personal');

      await expect(apiKeys.rowByName(EXPIRED_KEY)).toBeVisible();
      await expect(apiKeys.rowByName(CROSS_CLUSTER_KEY)).toBeVisible();
      await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeVisible();
    });

    await test.step('each type filter narrows to that type alone', async () => {
      await apiKeys.toggleTypeFilter('cross_cluster');
      await expect(apiKeys.rowByName(CROSS_CLUSTER_KEY)).toBeVisible();
      await expect(apiKeys.rowByName(EXPIRED_KEY)).toBeHidden();

      await apiKeys.toggleTypeFilter('managed');
      await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeVisible();
      await expect(apiKeys.rowByName(MANAGED_BY_NAME_KEY)).toBeVisible();
      await expect(apiKeys.rowByName(CROSS_CLUSTER_KEY)).toBeHidden();

      await apiKeys.toggleTypeFilter('managed');
    });

    await test.step('the expiry filters separate active from expired', async () => {
      await apiKeys.toggleExpiryFilter('active');
      await expect(apiKeys.rowByName(MANAGED_BY_NAME_KEY)).toBeVisible();
      await expect(apiKeys.rowByName(CROSS_CLUSTER_KEY)).toBeVisible();
      await expect(apiKeys.rowByName(EXPIRED_KEY)).toBeHidden();

      await apiKeys.toggleExpiryFilter('expired');
      await expect(apiKeys.rowByName(EXPIRED_KEY)).toBeVisible();
      await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeHidden();
    });
  });

  test('narrows the grid to a selected owner', async ({ pageObjects, page, kbnUrl, esClient }) => {
    const apiKeys = pageObjects.apiKeys;
    const currentUsername = await getCurrentUsername(page, kbnUrl);
    const seedOwnerUsername = await resolveApiKeyOwner(esClient, CROSS_CLUSTER_KEY);

    await apiKeys.toggleTypeFilter('personal');
    await apiKeys.openOwnerFilter();

    await expect(apiKeys.ownerFilterOption(currentUsername)).toBeVisible();
    await expect(apiKeys.ownerFilterOption(seedOwnerUsername)).toBeVisible();

    await apiKeys.ownerFilterOption(currentUsername).click();
    await expect(apiKeys.rowByName(OWN_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(CROSS_CLUSTER_KEY)).toBeHidden();

    await apiKeys.ownerFilterOption(currentUsername).click();
    await apiKeys.ownerFilterOption(seedOwnerUsername).click();

    await expect(apiKeys.rowByName(CROSS_CLUSTER_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(OWN_KEY)).toBeHidden();
  });

  test('narrows the grid by name from the search bar', async ({ pageObjects }) => {
    const apiKeys = pageObjects.apiKeys;

    await apiKeys.toggleTypeFilter('personal');

    await apiKeys.search(OWN_KEY);
    await expect(apiKeys.rowByName(OWN_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeHidden();

    await apiKeys.search(`"${MANAGED_BY_METADATA_KEY}"`);
    await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(OWN_KEY)).toBeHidden();

    await apiKeys.search('"api"');
    await expect(apiKeys.rowByName(OWN_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeVisible();
  });
});
