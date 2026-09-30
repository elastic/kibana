/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  clearDefaultRepository,
  createLocalRepository,
  deleteAllRepositories,
  LOCAL_REPOSITORY_NAME,
  RESPONSE_KEYS_WITHOUT_DEFAULT,
  setDefaultRepository,
  testData,
} from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

// Local only: the cluster starts with no repository, so the empty state can be asserted. Cloud is
// covered in snapshot_repositories_cloud.spec.ts. Serverless has no snapshot repositories UI.
apiTest.describe('Snapshot repositories API (local)', { tag: ['@local-stateful-classic'] }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await clearDefaultRepository(esClient);
    await deleteAllRepositories(esClient);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await clearDefaultRepository(esClient);
    await deleteAllRepositories(esClient);
  });

  apiTest('reports no default repository when none is configured', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/snapshot_repositories`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(Object.keys(response.body).sort()).toStrictEqual(RESPONSE_KEYS_WITHOUT_DEFAULT);
    expect(response.body.canCreateRepository).toBe(true);
    expect(response.body.hasDefaultRepository).toBe(false);
    expect(response.body.hasRepositories).toBe(false);
  });

  apiTest('reports the configured default repository', async ({ apiClient, esClient }) => {
    await createLocalRepository(esClient);
    await setDefaultRepository(esClient, LOCAL_REPOSITORY_NAME);

    const response = await apiClient.get(`${API_BASE_PATH}/snapshot_repositories`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.hasDefaultRepository).toBe(true);
    expect(response.body.defaultRepository).toBe(LOCAL_REPOSITORY_NAME);
    expect(response.body.canCreateRepository).toBe(true);
    expect(response.body.hasRepositories).toBe(true);
  });
});
