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
  testData,
  uniqueName,
} from '../fixtures';

apiTest.describe('Index Management indices API', { tag: tags.stateful.classic }, () => {
  const indices: string[] = [];

  apiTest.afterAll(async ({ esClient, log }) => {
    await deleteIndices(esClient, indices, log);
  });

  apiTest('creates an index', async ({ apiClient, esClient, samlAuth }) => {
    const indexName = uniqueName('im-create-index');
    indices.push(indexName);

    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const response = await indexManagementApi(
      apiClient,
      createHeaders(cookieHeader)
    ).indices.create(indexName, 'logsdb');

    expect(response).toHaveStatusCode(200);

    const catResponse = await esClient.cat.indices({ index: indexName, format: 'json', h: 'i' });
    expect(catResponse.map((indexItem) => indexItem.i)).toContain(indexName);
  });

  apiTest('requires index name and index mode', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const api = indexManagementApi(apiClient, createHeaders(cookieHeader));

    const missingNameResponse = await api.indices.create(undefined, 'standard');
    expect(missingNameResponse).toHaveStatusCode(400);
    expect(missingNameResponse.body.message).toContain('expected value of type [string]');

    const missingModeResponse = await api.indices.create(uniqueName('im-create-index'), undefined);
    expect(missingModeResponse).toHaveStatusCode(400);
    expect(missingModeResponse.body.message).toContain('expected value of type [string]');
  });

  apiTest('clears index cache', async ({ apiClient, esClient, requestAuth }) => {
    const index = await createIndex({ esClient, index: uniqueName('im-clear-cache') });
    indices.push(index);

    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const response = await indexManagementApi(
      apiClient,
      createHeaders(apiKeyHeader)
    ).indices.clearCache(index);

    expect(response).toHaveStatusCode(200);
  });

  apiTest('closes and opens an index', async ({ apiClient, esClient, requestAuth }) => {
    const index = await createIndex({ esClient, index: uniqueName('im-close-open') });
    indices.push(index);

    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));

    const closeResponse = await api.indices.close(index);
    expect(closeResponse).toHaveStatusCode(200);
    expect((await esClient.cat.indices({ index, format: 'json' }))[0].status).toBe('close');

    const openResponse = await api.indices.open(index);
    expect(openResponse).toHaveStatusCode(200);
    expect((await esClient.cat.indices({ index, format: 'json' }))[0].status).toBe('open');
  });

  apiTest(
    'deletes an index and validates missing input',
    async ({ apiClient, esClient, requestAuth }) => {
      const index = await createIndex({ esClient, index: uniqueName('im-delete-index') });

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));

      const deleteResponse = await api.indices.delete(index);
      expect(deleteResponse).toHaveStatusCode(200);

      const catResponse = await esClient.cat.indices({ index: '*', format: 'json', h: 'i' });
      expect(catResponse.map((indexItem) => indexItem.i)).not.toContain(index);

      const validationResponse = await api.indices.delete();
      expect(validationResponse).toHaveStatusCode(400);
      expect(validationResponse.body.message).toContain('expected value of type [string]');
    }
  );

  apiTest(
    'flushes, refreshes, and force-merges an index',
    async ({ apiClient, esClient, requestAuth }) => {
      const index = await createIndex({ esClient, index: uniqueName('im-index-actions') });
      indices.push(index);

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));

      const flushBefore = await esClient.indices.stats({ index, metric: 'flush' });
      const flushResponse = await api.indices.flush(index);
      expect(flushResponse).toHaveStatusCode(200);
      const flushAfter = await esClient.indices.stats({ index, metric: 'flush' });
      expect(flushAfter.indices?.[index].total?.flush?.total).toBe(
        (flushBefore.indices?.[index].total?.flush?.total ?? 0) + 1
      );

      const refreshBefore = await esClient.indices.stats({ index, metric: 'refresh' });
      const refreshResponse = await api.indices.refresh(index);
      expect(refreshResponse).toHaveStatusCode(200);
      const refreshAfter = await esClient.indices.stats({ index, metric: 'refresh' });
      expect(refreshAfter.indices?.[index].total?.refresh?.total).toBe(
        (refreshBefore.indices?.[index].total?.refresh?.total ?? 0) + 1
      );

      expect(await api.indices.forceMerge(index, 1)).toHaveStatusCode(200);
    }
  );

  apiTest(
    'lists and reloads indices with expected properties',
    async ({ apiClient, esClient, requestAuth }) => {
      const index = await createIndex({ esClient, index: uniqueName('im-list-reload') });
      indices.push(index);

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));

      const listResponse = await api.indices.list();
      expect(listResponse).toHaveStatusCode(200);
      const listedIndex = listResponse.body.find(({ name }: { name: string }) => name === index);
      expect(Object.keys(listedIndex).sort()).toStrictEqual(testData.SORTED_EXPECTED_INDEX_KEYS);

      const reloadResponse = await api.indices.reload([index]);
      expect(reloadResponse).toHaveStatusCode(200);
      expect(reloadResponse.body).toHaveLength(1);
      expect(reloadResponse.body[0].name).toBe(index);
    }
  );
});
