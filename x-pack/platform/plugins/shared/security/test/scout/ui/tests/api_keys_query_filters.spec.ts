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
  test,
  testData,
} from '../fixtures';

const CROSS_CLUSTER_KEY = 'test_cross_cluster';
const MANAGED_BY_METADATA_KEY = 'my api key';
const MANAGED_BY_NAME_KEY = 'Alerting: Managed';
const EXPIRED_KEY = 'test_api_key';
const OWN_KEY = 'test_user_api_key';

const SEEDED_KEYS = [CROSS_CLUSTER_KEY, MANAGED_BY_METADATA_KEY, MANAGED_BY_NAME_KEY, EXPIRED_KEY];

// Resolved at runtime: the Elasticsearch user `esClient` authenticates as owns the seeded keys, and
// its name differs between local and Cloud deployments.
let seedOwnerUsername: string;

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

    // `1ms` rather than the FTR suite's `1s`: the key must already be expired when the first test
    // reads the grid, and a one-second window is a race.
    await esClient.security.createApiKey({
      name: EXPIRED_KEY,
      expiration: '1ms',
      role_descriptors: { role_1: {} },
    });

    const { api_keys: seededKeys } = await esClient.security.queryApiKeys({
      query: { term: { name: CROSS_CLUSTER_KEY } },
    });

    // Without this an unrefreshed `.security` index fails all five tests with an opaque
    // "Cannot read properties of undefined" instead of naming the missing seed.
    if (seededKeys.length === 0) {
      throw new Error(
        `Seeded key "${CROSS_CLUSTER_KEY}" is not queryable; cannot resolve its owner`
      );
    }

    seedOwnerUsername = seededKeys[0].username;
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

  test('separates active keys from expired keys', async ({ pageObjects }) => {
    const apiKeys = pageObjects.apiKeys;

    await apiKeys.toggleTypeFilter('personal');
    await apiKeys.toggleExpiryFilter('active');

    await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(MANAGED_BY_NAME_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(CROSS_CLUSTER_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(EXPIRED_KEY)).toBeHidden();

    await apiKeys.toggleExpiryFilter('expired');

    await expect(apiKeys.rowByName(EXPIRED_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeHidden();
  });

  test('narrows the grid to one key type at a time', async ({ pageObjects }) => {
    const apiKeys = pageObjects.apiKeys;

    await apiKeys.toggleTypeFilter('personal');
    await expect(apiKeys.rowByName(EXPIRED_KEY)).toBeVisible();

    await apiKeys.toggleTypeFilter('cross_cluster');
    await expect(apiKeys.rowByName(CROSS_CLUSTER_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(EXPIRED_KEY)).toBeHidden();

    await apiKeys.toggleTypeFilter('managed');
    await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(MANAGED_BY_NAME_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(CROSS_CLUSTER_KEY)).toBeHidden();
  });

  test('narrows the grid to a selected owner', async ({ pageObjects, page, kbnUrl }) => {
    const apiKeys = pageObjects.apiKeys;
    const currentUsername = await getCurrentUsername(page, kbnUrl);

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

    // A quoted single term matches on a word within the name. The `OWN_KEY` assertion is the one
    // that can actually fail here: the previous query excluded that row, so it only reappears once
    // the `"api"` response has landed.
    await apiKeys.search('"api"');
    await expect(apiKeys.rowByName(OWN_KEY)).toBeVisible();
    await expect(apiKeys.rowByName(MANAGED_BY_METADATA_KEY)).toBeVisible();
  });
});
