/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { evaluate, tags } from '@kbn/evals';
import { restoreSnapshot, createGcsRepository } from '@kbn/es-snapshot-loader';

const BUCKET = 'agent-builder-data-science-datasets';

const DATASETS = [
  {
    name: 'BrowseComp-Plus',
    basePath: 'snapshots/browsecomp_plus',
    snapshotName: 'browsecomp_plus_documents_semantic',
  },
  {
    name: 'EnterpriseRAG-Bench',
    basePath: 'snapshots/enterprise_rag_bench',
    snapshotName: 'enterprise_rag_bench_documents_semantic',
  },
  {
    name: 'Analytical v2',
    basePath: 'snapshots/analytical_datasets_multi_domain',
    snapshotName: 'analytical_datasets_multi_domain',
  },
];

// Temporary: measures how long restoring the Agent Builder datasets takes in CI.
evaluate.describe('restore timing: agent builder datasets', { tag: tags.stateful.classic }, () => {
  // Restores can take far longer than the 5 min default, and they must not overlap or the
  // timings would include contention from the previous restore.
  evaluate.describe.configure({ mode: 'serial', timeout: 90 * 60 * 1000 });

  const restored: string[] = [];

  for (const dataset of DATASETS) {
    evaluate(`restore timing: ${dataset.name}`, async ({ esClient, log }) => {
      const start = Date.now();
      const result = await restoreSnapshot({
        esClient,
        log,
        repository: createGcsRepository({ bucket: BUCKET, basePath: dataset.basePath }),
        snapshotName: dataset.snapshotName,
      });
      const seconds = ((Date.now() - start) / 1000).toFixed(1);

      restored.push(...result.restoredIndices);
      log.info(
        `⏱️ RESTORE_TIMING ${dataset.name}: ${seconds}s, ${result.restoredIndices.length} indices` +
          (result.errors.length ? `, errors: ${result.errors.join('; ')}` : '')
      );

      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
    });
  }

  evaluate.afterAll(async ({ esClient, log }) => {
    if (restored.length === 0) return;
    await esClient.indices
      .delete({ index: restored, ignore_unavailable: true })
      .catch((error: Error) => log.warning(`Cleanup failed: ${error.message}`));
  });
});
