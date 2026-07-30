/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { getIndexState } from '@kbn/upgrade-assistant-pkg-server';
import type { ResolveIndexResponseFromES } from '@kbn/upgrade-assistant-pkg-server';
import type { ReindexOperation } from '../../../../common';
import { apiTest, testData } from '../fixtures';
import {
  cleanupIndices,
  cleanupReindexOperations,
  createSystemIndicesEsClient,
  waitForReindexToComplete,
} from '../fixtures/helpers';

const { API_BASE_PATH, COMMON_HEADERS, REINDEX_SERVICE_API_TAGS } = testData;

const BATCH_INDICES = ['batch-reindex-test1', 'batch-reindex-test2', 'batch-reindex-test3'];
const targetName = (indexName: string) => `${indexName}-new`;

// Seed each source index with documents so the reindexes take long enough to exercise the queue.
const SEED_DOC_COUNT = 200;

apiTest.describe('Reindex service batch API', { tag: REINDEX_SERVICE_API_TAGS }, () => {
  let adminCredentials: RoleApiCredentials;
  let headers: Record<string, string>;
  // Client with system-index privileges for the `.kibana` reindex-operation saved objects.
  let sysEsClient: EsClient;

  apiTest.beforeAll(async ({ requestAuth, config, esClient }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    headers = { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader };
    sysEsClient = await createSystemIndicesEsClient(esClient, config);
  });

  apiTest.beforeEach(async ({ esClient }) => {
    for (const indexName of BATCH_INDICES) {
      await esClient.indices.create({ index: indexName });
      await esClient.bulk({
        index: indexName,
        refresh: 'wait_for',
        operations: Array.from({ length: SEED_DOC_COUNT }, (_, i) => [
          { index: {} },
          { n: i },
        ]).flat(),
      });
    }
    // First index in the batch starts closed; it must remain closed after reindexing.
    await esClient.indices.close({ index: BATCH_INDICES[0] });
  });

  apiTest.afterEach(async ({ esClient }) => {
    await cleanupReindexOperations(sysEsClient);
    // Wildcard covers the source indices and their `-new` reindex targets (including the one that
    // ends up closed) without 404-ing on any that a failed run left in a different state.
    await cleanupIndices(esClient, ['batch-reindex-test*']);
  });

  apiTest.afterAll(async () => {
    await sysEsClient.close();
  });

  apiTest('reindexes a batch and reports queue state', async ({ apiClient, esClient }) => {
    // Three sequential reindexes plus polling exceed Playwright's 60s default.
    apiTest.setTimeout(180_000);

    const enqueueResponse = await apiClient.post(`${API_BASE_PATH}/batch`, {
      headers,
      body: {
        indices: BATCH_INDICES.map((indexName) => ({
          indexName,
          newIndexName: targetName(indexName),
          reindexOptions: { deleteOldIndex: true },
        })),
      },
    });

    expect(enqueueResponse).toHaveStatusCode(200);
    expect(enqueueResponse.body.errors).toHaveLength(0);
    // All three indices are enqueued. The enqueue/processing order is an implementation detail
    // (the closed index is reordered), so assert the set of enqueued indices, not the sequence.
    expect(
      enqueueResponse.body.enqueued.map((op: ReindexOperation) => op.indexName).sort()
    ).toStrictEqual([...BATCH_INDICES].sort());

    // The first batch index starts closed and must remain closed after reindexing.
    const closedTargetName = targetName(BATCH_INDICES[0]);

    // Every source index reindexes to completion.
    for (const indexName of BATCH_INDICES) {
      const lastState = await waitForReindexToComplete(apiClient, headers, indexName);
      expect(lastState.errorMessage).toBeNull();
    }

    // Once every operation has completed, the batch queue drains to empty.
    const finalQueue = await apiClient.get(`${API_BASE_PATH}/batch/queue`, { headers });
    expect(finalQueue).toHaveStatusCode(200);
    expect(finalQueue.body.queue).toHaveLength(0);

    // The index that started closed is closed again after reindexing.
    const resolved = await esClient.indices.resolveIndex({ name: closedTargetName });
    expect(getIndexState(closedTargetName, resolved as ResolveIndexResponseFromES)).toBe('closed');
  });
});
