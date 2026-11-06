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
  'Rollup search',
  { tag: ['@local-stateful-classic', '@cloud-stateful-classic'] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(ROLLUP_ADMIN_ROLE);
      headers = { ...COMMON_HEADERS, ...apiKeyHeader };
    });

    // Defensive sweep in case an interrupted run left rollup jobs or indices behind.
    apiTest.beforeEach(async ({ esClient }) => {
      await cleanupRollupState(esClient);
    });

    apiTest.afterEach(async ({ esClient }) => {
      await cleanupRollupState(esClient);
    });

    apiTest('returns 404 for a missing rollup index', async ({ apiClient }) => {
      const missingIndex = uniqueTargetIndex('search-missing');

      const response = await rollupApi(apiClient, headers).search([
        { index: missingIndex, query: {} },
      ]);

      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toContain(`no such index [${missingIndex}]`);
    });

    apiTest('searches an existing rollup index', async ({ apiClient, esClient }) => {
      const api = rollupApi(apiClient, headers);
      // Since 8.15 ES only allows creating a rollup job when the cluster already has rollup usage,
      // which the mock index simulates.
      await createMockRollupUsage(esClient, 'search');
      const indexName = await createSourceIndex(esClient, 'search');
      const targetIndex = uniqueTargetIndex('search');
      await api.createJob(getJobPayload(indexName, uniqueJobId('search'), targetIndex));

      const response = await api.search([{ index: targetIndex, query: { size: 0 } }]);

      expect(response).toHaveStatusCode(200);
      // `hits.total` must be an integer, not the `{ value, relation }` object the ES search API
      // returns by default.
      expect(response.body[0].hits.total).toBe(0);
    });
  }
);
