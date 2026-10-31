/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';

import {
  API_BASE_PATH,
  ILM_API_ROLE,
  NEVER_FIRING_SCHEDULE,
  getHeaders,
  getResourceName,
} from '../fixtures/constants';

// Local stateful only: the SLM policy needs a file system (`fs`) repository, which Cloud forbids.
// The empty-list case is covered by a Jest route test.
apiTest.describe(
  'Index Lifecycle Management - snapshot policies',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;
    const repository = getResourceName('repo');
    const slmPolicy = getResourceName('slm-policy');

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKeyForCustomRole(ILM_API_ROLE);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.slm.deleteLifecycle({ policy_id: slmPolicy }, { ignore: [404] });
      await esClient.snapshot.deleteRepository({ name: repository }, { ignore: [404] });
    });

    apiTest('returns the snapshot policies', async ({ apiClient, esClient }) => {
      await esClient.snapshot.createRepository({
        name: repository,
        repository: { type: 'fs', settings: { location: `/tmp/repo/${repository}` } },
        verify: false,
      });
      await esClient.slm.putLifecycle({
        policy_id: slmPolicy,
        name: slmPolicy,
        schedule: NEVER_FIRING_SCHEDULE,
        repository,
        config: { indices: [`${slmPolicy}-*`] },
      });

      const response = await apiClient.get(`${API_BASE_PATH}/snapshot_policies`, {
        headers: getHeaders(credentials),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toContain(slmPolicy);
    });
  }
);
