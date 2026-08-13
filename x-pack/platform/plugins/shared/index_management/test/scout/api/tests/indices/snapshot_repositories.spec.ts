/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const DEFAULT_REPOSITORY_SETTING = 'repositories.default_repository';
const REPOSITORY_NAME = 'index-management-api-snapshot-repo';

const cleanup = async (esClient: EsClient) => {
  await esClient.cluster.putSettings({ persistent: { [DEFAULT_REPOSITORY_SETTING]: null } });
  await esClient.snapshot.deleteRepository({ name: REPOSITORY_NAME }, { ignore: [404] });
};

// Snapshot repositories are not managed from Index Management on serverless.
apiTest.describe('Snapshot repositories API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await cleanup(esClient);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await cleanup(esClient);
  });

  apiTest('reports no default repository when none is configured', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/snapshot_repositories`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    // `defaultRepository` is undefined and therefore omitted from the JSON response.
    expect(Object.keys(response.body).sort()).toStrictEqual([
      'canCreateRepository',
      'hasDefaultRepository',
      'hasRepositories',
    ]);
    expect(typeof response.body.canCreateRepository).toBe('boolean');
    expect(response.body.hasDefaultRepository).toBe(false);
    expect(response.body.hasRepositories).toBe(false);
  });

  apiTest('reports the configured default repository', async ({ apiClient, esClient }) => {
    // A repository has to be registered before it can be set as the cluster default. `/tmp/repo` is
    // one of the locations Scout allows in `path.repo`.
    await esClient.snapshot.createRepository({
      name: REPOSITORY_NAME,
      repository: { type: 'fs', settings: { location: '/tmp/repo' } },
      verify: false,
    });
    await esClient.cluster.putSettings({
      persistent: { [DEFAULT_REPOSITORY_SETTING]: REPOSITORY_NAME },
    });

    const response = await apiClient.get(`${API_BASE_PATH}/snapshot_repositories`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.hasDefaultRepository).toBe(true);
    expect(response.body.defaultRepository).toBe(REPOSITORY_NAME);
    expect(typeof response.body.canCreateRepository).toBe('boolean');
    expect(response.body.hasRepositories).toBe(true);
  });
});
