/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, ROLLUP_ADMIN_ROLE } from '../fixtures/constants';
import type { RollupApi, RollupJobSummary } from '../fixtures/rollup_jobs';
import {
  cleanupRollupState,
  createMockRollupUsage,
  createSourceIndex,
  findJob,
  getJobPayload,
  rollupApi,
  uniqueJobId,
  uniqueTargetIndex,
} from '../fixtures/rollup_jobs';

const getJobState = async (api: RollupApi, jobId: string) => {
  const { body } = await api.loadJobs();
  const job: RollupJobSummary | undefined = findJob(body, jobId);
  return job?.status.job_state;
};

apiTest.describe(
  'Rollup job actions',
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
      await createMockRollupUsage(esClient, 'actions');
      const indexName = await createSourceIndex(esClient, 'actions');
      jobId = uniqueJobId('actions');
      await rollupApi(apiClient, headers).createJob(
        getJobPayload(indexName, jobId, uniqueTargetIndex('actions'))
      );
    });

    apiTest.afterEach(async ({ esClient }) => {
      await cleanupRollupState(esClient);
    });

    apiTest('starts a job', async ({ apiClient }) => {
      const api = rollupApi(apiClient, headers);
      expect(await getJobState(api, jobId)).toBe('stopped');

      const response = await api.startJob([jobId]);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ success: true });
      // Elasticsearch indexes the job state change asynchronously; allow extra time on slow CI.
      await expect.poll(() => getJobState(api, jobId), { timeout: 30_000 }).toBe('started');
    });

    apiTest('succeeds when starting an already started job', async ({ apiClient }) => {
      const api = rollupApi(apiClient, headers);
      await api.startJob([jobId]);

      const response = await api.startJob([jobId]);

      expect(response).toHaveStatusCode(200);
    });

    apiTest('stops a job', async ({ apiClient }) => {
      const api = rollupApi(apiClient, headers);
      await api.startJob([jobId]);

      const response = await api.stopJob([jobId]);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ success: true });
      // The route is called with `waitForCompletion`, so the state is already settled.
      expect(await getJobState(api, jobId)).toBe('stopped');
    });

    apiTest('succeeds when stopping an already stopped job', async ({ apiClient }) => {
      const response = await rollupApi(apiClient, headers).stopJob([jobId]);

      expect(response).toHaveStatusCode(200);
    });
  }
);
