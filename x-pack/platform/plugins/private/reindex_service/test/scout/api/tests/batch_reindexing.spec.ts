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

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const BATCH_INDICES = ['batch-reindex-test1', 'batch-reindex-test2', 'batch-reindex-test3'];
const targetName = (indexName: string) => `${indexName}-new`;
// Source indices plus their `-new` reindex targets.
const INDEX_CLEANUP_PATTERN = 'batch-reindex-test*';

// Enough docs that the reindexes take long enough to exercise the queue.
const SEED_DOC_COUNT = 200;

// Stateful only: reindexing writes directly to the `.kibana` system index, not allowed on serverless.
apiTest.describe('Reindex service batch API', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let headers: Record<string, string>;
  // System-index privileges for the `.kibana` reindex-operation saved objects.
  let sysEsClient: EsClient;

  apiTest.beforeAll(async ({ requestAuth, config, esClient }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    headers = { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader };
    sysEsClient = await createSystemIndicesEsClient(esClient, config);

    await cleanupReindexOperations(sysEsClient);
    await cleanupIndices(esClient, [INDEX_CLEANUP_PATTERN]);
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
    // First index starts closed; it must remain closed after reindexing.
    await esClient.indices.close({ index: BATCH_INDICES[0] });
  });

  apiTest.afterEach(async ({ esClient }) => {
    await cleanupReindexOperations(sysEsClient);
    await cleanupIndices(esClient, [INDEX_CLEANUP_PATTERN]);
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
    // Processing order is not stable (the closed index is reordered), so assert the enqueued set.
    expect(
      enqueueResponse.body.enqueued.map((op: ReindexOperation) => op.indexName).sort()
    ).toStrictEqual([...BATCH_INDICES].sort());

    const closedTargetName = targetName(BATCH_INDICES[0]);

    for (const indexName of BATCH_INDICES) {
      const lastState = await waitForReindexToComplete(apiClient, headers, indexName);
      expect(lastState.errorMessage).toBeNull();
      // `waitForReindexToComplete` also returns on failed/paused/cancelled, so assert success.
      expect(lastState.status).toBe(ReindexStatus.completed);
    }

    const finalQueue = await apiClient.get(`${API_BASE_PATH}/batch/queue`, { headers });
    expect(finalQueue).toHaveStatusCode(200);
    expect(finalQueue.body.queue).toHaveLength(0);

    // Resolve with `expand_wildcards: 'all'` so the closed target is returned (matching production's
    // `getIndexState` state check), otherwise it is filtered out.
    const resolved = await esClient.indices.resolveIndex({
      name: closedTargetName,
      expand_wildcards: 'all',
    });
    expect(getIndexState(closedTargetName, resolved as ResolveIndexResponseFromES)).toBe('closed');
  });
});
