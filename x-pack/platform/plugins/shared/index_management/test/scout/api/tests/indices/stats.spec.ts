/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_NAME = 'index-management-api-stats';

// Guards against Elasticsearch dropping a metric from the index stats it reports.
const EXPECTED_STATS = [
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
];

// Stateful only: index stats are not exposed on serverless
// (`xpack.index_management.enableIndexStats: false` in `config/serverless.yml`).
apiTest.describe('Index stats API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
    await esClient.indices.create({ index: INDEX_NAME });
  });

  apiTest.afterEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
  });

  apiTest('fetches the index stats', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/stats/${INDEX_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);

    const missing = EXPECTED_STATS.filter(
      (stat) => !Object.hasOwn(response.body.stats.total, stat)
    );
    expect(missing).toStrictEqual([]);
  });
});
