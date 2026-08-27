/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, deleteIndices, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_PREFIX = 'index-management-api-indices-actions';
const INDEX_NAME = `${INDEX_PREFIX}-target`;

const indexStatus = async (esClient: EsClient) => {
  const [index] = await esClient.cat.indices({ index: INDEX_NAME, format: 'json', h: 'status' });
  return index.status;
};

// `total` sums primaries and replicas, so one action bumps it once per assigned replica.
const primaryMetricTotal = async (esClient: EsClient, metric: 'flush' | 'refresh') => {
  const { indices } = await esClient.indices.stats({ index: INDEX_NAME, metric });
  return indices?.[INDEX_NAME].primaries?.[metric]?.total ?? 0;
};

// Closing, opening, flushing, refreshing, force merging and clearing the cache are not exposed in Serverless.
apiTest.describe('Indices actions API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  const executeAction = (apiClient: ApiClientFixture, action: string, args?: object) =>
    apiClient.post(`${API_BASE_PATH}/indices/${action}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ indices: [INDEX_NAME], ...args }),
    });

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await deleteIndices(esClient, `${INDEX_PREFIX}*`);
    await esClient.indices.create({ index: INDEX_NAME });
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteIndices(esClient, `${INDEX_PREFIX}*`);
  });

  apiTest('closes an index', async ({ apiClient, esClient }) => {
    expect(await indexStatus(esClient)).toBe('open');

    expect(await executeAction(apiClient, 'close')).toHaveStatusCode(200);

    expect(await indexStatus(esClient)).toBe('close');
  });

  apiTest('opens an index', async ({ apiClient, esClient }) => {
    await esClient.indices.close({ index: INDEX_NAME });
    expect(await indexStatus(esClient)).toBe('close');

    expect(await executeAction(apiClient, 'open')).toHaveStatusCode(200);

    expect(await indexStatus(esClient)).toBe('open');
  });

  apiTest('flushes an index', async ({ apiClient, esClient }) => {
    expect(await primaryMetricTotal(esClient, 'flush')).toBe(0);

    expect(await executeAction(apiClient, 'flush')).toHaveStatusCode(200);

    expect(await primaryMetricTotal(esClient, 'flush')).toBe(1);
  });

  apiTest('refreshes an index', async ({ apiClient, esClient }) => {
    const before = await primaryMetricTotal(esClient, 'refresh');

    expect(await executeAction(apiClient, 'refresh')).toHaveStatusCode(200);

    expect(await primaryMetricTotal(esClient, 'refresh')).toBe(before + 1);
  });

  apiTest('force merges an index', async ({ apiClient }) => {
    expect(await executeAction(apiClient, 'forcemerge')).toHaveStatusCode(200);
  });

  apiTest('force merges an index into a given number of segments', async ({ apiClient }) => {
    expect(await executeAction(apiClient, 'forcemerge', { maxNumSegments: 1 })).toHaveStatusCode(
      200
    );
  });

  apiTest('clears the cache of an index', async ({ apiClient }) => {
    expect(await executeAction(apiClient, 'clear_cache')).toHaveStatusCode(200);
  });
});
