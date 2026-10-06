/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, ROLLUP_ADMIN_ROLE, TEST_RESOURCE_PREFIX } from '../fixtures/constants';
import {
  cleanupRollupState,
  createSourceIndex,
  getJobPayload,
  rollupApi,
  uniqueJobId,
  uniqueTargetIndex,
} from '../fixtures/rollup_jobs';

// Local stateful only: `rejects job creation` needs a cluster with *no* rollup usage at all, which
// only a fresh local cluster guarantees. Rollup does not exist on serverless.
apiTest.describe(
  'Rollup indices without rollup usage in the cluster',
  { tag: ['@local-stateful-classic'] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(ROLLUP_ADMIN_ROLE);
      headers = { ...COMMON_HEADERS, ...apiKeyHeader };
    });

    apiTest.beforeEach(async ({ esClient }) => {
      await cleanupRollupState(esClient);
    });

    apiTest.afterEach(async ({ esClient }) => {
      await cleanupRollupState(esClient);
    });

    apiTest('reports no rollup indices owned by these tests', async ({ apiClient }) => {
      const response = await rollupApi(apiClient, headers).getIndices();

      expect(response).toHaveStatusCode(200);
      expect(
        Object.keys(response.body).filter((name) => name.startsWith(TEST_RESOURCE_PREFIX))
      ).toStrictEqual([]);
    });

    // Since 8.15 ES only allows creating a rollup job when the cluster already has rollup usage.
    apiTest('rejects job creation', async ({ apiClient, esClient }) => {
      // Precondition: no rollup usage anywhere in the cluster, otherwise ES returns 200.
      const rollupCaps = await esClient.rollup.getRollupIndexCaps({ index: '_all' });
      expect(Object.keys(rollupCaps)).toStrictEqual([]);

      const indexName = await createSourceIndex(esClient, 'no-usage');

      const response = await rollupApi(apiClient, headers).createJob(
        getJobPayload(indexName, uniqueJobId('no-usage'), uniqueTargetIndex('no-usage'))
      );

      expect(response).toHaveStatusCode(400);
      // Guard against unrelated 400s (XSRF, validation): the ES error is about rollup usage.
      expect(String(response.body.message).toLowerCase()).toContain('rollup');
    });
  }
);
