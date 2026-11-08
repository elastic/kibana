/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';

import { API_BASE_PATH, ILM_API_ROLE, getHeaders, getResourceName } from '../fixtures/constants';

// Local stateful only: file system (`fs`) repositories are forbidden on Cloud. Cloud is covered in
// snapshot_repositories_cloud.spec.ts. The empty-list case is covered by a Jest route test.
apiTest.describe(
  'Index Lifecycle Management - snapshot repositories',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;
    const repository = getResourceName('repo');

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKeyForCustomRole(ILM_API_ROLE);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.snapshot.deleteRepository({ name: repository }, { ignore: [404] });
    });

    apiTest('returns the snapshot repositories', async ({ apiClient, esClient }) => {
      await esClient.snapshot.createRepository({
        name: repository,
        repository: { type: 'fs', settings: { location: `/tmp/repo/${repository}` } },
        verify: false,
      });

      const response = await apiClient.get(`${API_BASE_PATH}/snapshot_repositories`, {
        headers: getHeaders(credentials),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.repositories).toContain(repository);
    });
  }
);
