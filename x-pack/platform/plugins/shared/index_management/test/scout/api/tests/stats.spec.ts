/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  apiTest,
  createHeaders,
  createIndex,
  deleteIndices,
  indexManagementApi,
  uniqueName,
} from '../fixtures';

const expectedStats = [
  'docs',
  'store',
  'indexing',
  'get',
  'search',
  'merges',
  'refresh',
  'flush',
  'warmer',
  'query_cache',
  'fielddata',
  'completion',
  'segments',
  'translog',
  'request_cache',
  'recovery',
] as const;

apiTest.describe('Index Management stats API', { tag: tags.stateful.classic }, () => {
  let indexName: string;

  apiTest.beforeAll(async ({ esClient }) => {
    indexName = await createIndex({ esClient, index: uniqueName('im-stats') });
  });

  apiTest.afterAll(async ({ esClient, log }) => {
    await deleteIndices(esClient, [indexName], log);
  });

  apiTest('fetches index stats', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const response = await indexManagementApi(
      apiClient,
      createHeaders(apiKeyHeader)
    ).indices.getStats(indexName);

    expect(response).toHaveStatusCode(200);

    for (const stat of expectedStats) {
      expect(Object.hasOwn(response.body.stats.total, stat), `Expected stat "${stat}"`).toBe(true);
    }
  });
});
