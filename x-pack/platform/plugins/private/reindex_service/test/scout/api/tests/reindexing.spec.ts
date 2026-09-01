/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import { apiTest, testData } from '../fixtures';
import {
  cleanupIndices,
  cleanupReindexOperations,
  createPausedReindexOperation,
  createSystemIndicesEsClient,
  loadDummydata,
  waitForReindexToComplete,
} from '../fixtures/helpers';

const { API_BASE_PATH, COMMON_HEADERS, SOURCE_INDEX, REINDEXED_INDEX } = testData;

// Wildcards covering every index this suite creates or reindexes into.
const INDEX_CLEANUP_PATTERNS = ['dummydata*', 'reindexed-v8-dummydata*', 'lookup-dummydata*'];

// Stateful only: reindexing writes directly to the `.kibana` system index, not allowed on serverless.
apiTest.describe('Reindex service API', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let headers: Record<string, string>;
  // System-index privileges for the `.kibana` reindex-operation saved objects.
  let sysEsClient: EsClient;

  apiTest.beforeAll(async ({ requestAuth, config, esClient }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    headers = { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader };
    sysEsClient = await createSystemIndicesEsClient(esClient, config);

    await cleanupReindexOperations(sysEsClient);
    await cleanupIndices(esClient, INDEX_CLEANUP_PATTERNS);
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await loadDummydata(esClient);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await cleanupReindexOperations(sysEsClient);
    await cleanupIndices(esClient, INDEX_CLEANUP_PATTERNS);
  });

  apiTest.afterAll(async () => {
    await sysEsClient.close();
  });

  apiTest('creates a new index with the same documents', async ({ apiClient, esClient }) => {
    const { [SOURCE_INDEX]: originalIndex } = await esClient.indices.get({
      index: SOURCE_INDEX,
      flat_settings: true,
    });

    const response = await apiClient.post(API_BASE_PATH, {
      headers,
      body: {
        indexName: SOURCE_INDEX,
        newIndexName: REINDEXED_INDEX,
        reindexOptions: { deleteOldIndex: true },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.indexName).toBe(SOURCE_INDEX);
    expect(response.body.status).toBe(ReindexStatus.inProgress);

    const lastState = await waitForReindexToComplete(apiClient, headers, SOURCE_INDEX);
    expect(lastState.errorMessage).toBeNull();
    expect(lastState.status).toBe(ReindexStatus.completed);

    const { newIndexName } = lastState;
    const indexSummary = await esClient.indices.get({ index: SOURCE_INDEX, flat_settings: true });

    // The new index was created and the original index name is aliased to it.
    expect(indexSummary[newIndexName]).toBeDefined();
    expect(indexSummary[newIndexName].aliases?.[SOURCE_INDEX]).toBeDefined();
    expect(indexSummary[newIndexName].mappings?.properties).toBeDefined();
    expect(indexSummary[newIndexName].settings).toBeDefined();
    expect({
      'index.number_of_replicas': indexSummary[newIndexName].settings?.['index.number_of_replicas'],
      'index.refresh_interval': indexSummary[newIndexName].settings?.['index.refresh_interval'],
    }).toStrictEqual({
      'index.number_of_replicas': originalIndex.settings?.['index.number_of_replicas'],
      'index.refresh_interval': originalIndex.settings?.['index.refresh_interval'],
    });
    expect((await esClient.count({ index: newIndexName })).count).toBe(3);
  });

  apiTest(
    'preserves the original index settings after reindex',
    async ({ apiClient, esClient }) => {
      const originalSettings = {
        'index.number_of_replicas': 1,
        'index.refresh_interval': '10s',
      };

      // Force custom settings so we can assert they survive the reindex.
      await esClient.indices.putSettings({ index: SOURCE_INDEX, settings: originalSettings });

      const response = await apiClient.post(API_BASE_PATH, {
        headers,
        body: {
          indexName: SOURCE_INDEX,
          newIndexName: REINDEXED_INDEX,
          reindexOptions: { deleteOldIndex: true },
        },
      });
      expect(response).toHaveStatusCode(200);

      const lastState = await waitForReindexToComplete(apiClient, headers, SOURCE_INDEX);
      expect(lastState.errorMessage).toBeNull();
      expect(lastState.status).toBe(ReindexStatus.completed);

      const { newIndexName } = lastState;
      const indexSummary = await esClient.indices.get({ index: SOURCE_INDEX, flat_settings: true });

      expect(indexSummary[newIndexName]).toBeDefined();
      expect(indexSummary[newIndexName].aliases?.[SOURCE_INDEX]).toBeDefined();
      expect(indexSummary[newIndexName].mappings?.properties).toBeDefined();
      const newSettings = indexSummary[newIndexName].settings;
      // `flat_settings` returns values as strings; assert the custom settings survived the reindex.
      expect(String(newSettings?.['index.number_of_replicas'])).toBe('1');
      expect(newSettings?.['index.refresh_interval']).toBe('10s');
    }
  );

  apiTest('can resume a paused reindex operation', async ({ apiClient, esClient }) => {
    await createPausedReindexOperation(sysEsClient, {
      indexName: SOURCE_INDEX,
      newIndexName: REINDEXED_INDEX,
    });

    expect(await esClient.indices.exists({ index: REINDEXED_INDEX })).toBe(false);

    const response = await apiClient.post(API_BASE_PATH, {
      headers,
      body: {
        indexName: SOURCE_INDEX,
        newIndexName: REINDEXED_INDEX,
        reindexOptions: { deleteOldIndex: true },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.indexName).toBe(SOURCE_INDEX);
    expect(response.body.status).toBe(ReindexStatus.inProgress);

    const lastState = await waitForReindexToComplete(apiClient, headers, SOURCE_INDEX);
    expect(lastState.errorMessage).toBeNull();
    expect(lastState.status).toBe(ReindexStatus.completed);

    const indexSummary = await esClient.indices.get({ index: SOURCE_INDEX, flat_settings: true });
    expect(indexSummary[REINDEXED_INDEX]).toBeDefined();
    expect(indexSummary[REINDEXED_INDEX].aliases?.[SOURCE_INDEX]).toBeDefined();
    expect((await esClient.count({ index: REINDEXED_INDEX })).count).toBe(3);
  });

  apiTest(
    'updates any aliases pointing at the reindexed index',
    async ({ apiClient, esClient }) => {
      await esClient.indices.updateAliases({
        actions: [
          { add: { index: SOURCE_INDEX, alias: 'myAlias' } },
          { add: { index: 'dummy*', alias: 'wildcardAlias' } },
          {
            add: { index: SOURCE_INDEX, alias: 'myHttpsAlias', filter: { term: { https: true } } },
          },
        ],
      });
      expect((await esClient.count({ index: 'myAlias' })).count).toBe(3);
      expect((await esClient.count({ index: 'wildcardAlias' })).count).toBe(3);
      expect((await esClient.count({ index: 'myHttpsAlias' })).count).toBe(2);

      const response = await apiClient.post(API_BASE_PATH, {
        headers,
        body: {
          indexName: SOURCE_INDEX,
          newIndexName: REINDEXED_INDEX,
          reindexOptions: { deleteOldIndex: true },
        },
      });
      expect(response).toHaveStatusCode(200);

      const lastState = await waitForReindexToComplete(apiClient, headers, SOURCE_INDEX);
      expect(lastState.errorMessage).toBeNull();
      expect(lastState.status).toBe(ReindexStatus.completed);

      // Regular aliases still return 3 docs; the filtered alias still returns 2.
      expect((await esClient.count({ index: 'myAlias' })).count).toBe(3);
      expect((await esClient.count({ index: 'wildcardAlias' })).count).toBe(3);
      expect((await esClient.count({ index: 'myHttpsAlias' })).count).toBe(2);
    }
  );

  apiTest('creates a new lookup index', async ({ apiClient, esClient }) => {
    const { [SOURCE_INDEX]: originalIndex } = await esClient.indices.get({
      index: SOURCE_INDEX,
      flat_settings: true,
    });

    const response = await apiClient.post(API_BASE_PATH, {
      headers,
      body: {
        indexName: SOURCE_INDEX,
        newIndexName: 'lookup-dummydata',
        settings: { mode: 'lookup' },
        reindexOptions: { deleteOldIndex: true },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.indexName).toBe(SOURCE_INDEX);
    expect(response.body.status).toBe(ReindexStatus.inProgress);

    const lastState = await waitForReindexToComplete(apiClient, headers, SOURCE_INDEX);
    expect(lastState.errorMessage).toBeNull();
    expect(lastState.status).toBe(ReindexStatus.completed);

    const { newIndexName } = lastState;
    const indexSummary = await esClient.indices.get({ index: SOURCE_INDEX, flat_settings: true });

    expect(indexSummary[newIndexName]).toBeDefined();
    expect(indexSummary[newIndexName].aliases?.[SOURCE_INDEX]).toBeDefined();
    expect(indexSummary[newIndexName].mappings?.properties).toBeDefined();
    expect(indexSummary[newIndexName].settings).toBeDefined();
    expect({
      'index.number_of_replicas': indexSummary[newIndexName].settings?.['index.number_of_replicas'],
      'index.refresh_interval': indexSummary[newIndexName].settings?.['index.refresh_interval'],
      'index.mode': indexSummary[newIndexName].settings?.['index.mode'],
    }).toStrictEqual({
      'index.number_of_replicas': originalIndex.settings?.['index.number_of_replicas'],
      'index.refresh_interval': originalIndex.settings?.['index.refresh_interval'],
      'index.mode': 'lookup',
    });
    expect((await esClient.count({ index: newIndexName })).count).toBe(3);
  });

  apiTest(
    'refrains from deleting the old index when not requested',
    async ({ apiClient, esClient }) => {
      const response = await apiClient.post(API_BASE_PATH, {
        headers,
        body: {
          indexName: SOURCE_INDEX,
          newIndexName: 'dummydata_v2',
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.indexName).toBe(SOURCE_INDEX);
      expect(response.body.status).toBe(ReindexStatus.inProgress);

      const lastState = await waitForReindexToComplete(apiClient, headers, SOURCE_INDEX);
      expect(lastState.errorMessage).toBeNull();
      expect(lastState.status).toBe(ReindexStatus.completed);

      // The original index still exists...
      const { indices: sourceIndices } = await esClient.indices.resolveIndex({
        name: SOURCE_INDEX,
      });
      expect(sourceIndices).toHaveLength(1);

      // ...and the new index was created.
      const { indices: newIndices } = await esClient.indices.resolveIndex({ name: 'dummydata_v2' });
      expect(newIndices).toHaveLength(1);
    }
  );
});
