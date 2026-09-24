/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, ROLLUP_ADMIN_ROLE } from '../fixtures/constants';
import {
  cleanupRollupState,
  createMockRollupUsage,
  createSourceIndex,
  getJobPayload,
  rollupApi,
  uniqueJobId,
  uniqueTargetIndex,
} from '../fixtures/rollup_jobs';

apiTest.describe(
  'Rollup jobs deletion',
  { tag: ['@local-stateful-classic', '@cloud-stateful-classic'] },
  () => {
    let headers: Record<string, string>;
    let jobId: string;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(ROLLUP_ADMIN_ROLE);
      headers = { ...COMMON_HEADERS, ...apiKeyHeader };
    });

    apiTest.beforeEach(async ({ apiClient, esClient }) => {
      await cleanupRollupState(esClient);
      // Since 8.15 ES only allows creating a rollup job when the cluster already has rollup usage,
      // which the mock index simulates.
      await createMockRollupUsage(esClient, 'delete');
      const indexName = await createSourceIndex(esClient, 'delete');
      jobId = uniqueJobId('delete');
      await rollupApi(apiClient, headers).createJob(
        getJobPayload(indexName, jobId, uniqueTargetIndex('delete'))
      );
    });

    // `cleanupRollupState` stops jobs before deleting them, which also covers the test that leaves
    // the job started.
    apiTest.afterEach(async ({ esClient }) => {
      await cleanupRollupState(esClient);
    });

    apiTest('deletes a stopped job', async ({ apiClient }) => {
      const api = rollupApi(apiClient, headers);
      await api.stopJob([jobId]);

      const response = await api.deleteJob([jobId]);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ success: true });
    });

    apiTest('refuses to delete a started job', async ({ apiClient }) => {
      const api = rollupApi(apiClient, headers);
      await api.startJob([jobId]);

      const response = await api.deleteJob([jobId]);

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('Job must be [STOPPED] before deletion');
    });
  }
);
