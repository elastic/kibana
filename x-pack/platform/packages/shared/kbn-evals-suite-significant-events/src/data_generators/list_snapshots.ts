/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { createGcsRepository } from '@kbn/es-snapshot-loader';
import type { ToolingLog } from '@kbn/tooling-log';
import type { GcsConfig } from './snapshot_run_config';
import { resolveBasePath, SIGEVENTS_SNAPSHOT_RUN } from './snapshot_run_config';

/**
 * Lists all snapshot names available in the current {@link SIGEVENTS_SNAPSHOT_RUN}.
 * Registers a temporary GCS repository, queries the snapshot API, then cleans up.
 */
export async function listAvailableSnapshots(
  esClient: Client,
  log: ToolingLog,
  gcs: GcsConfig
): Promise<string[]> {
  const basePath = resolveBasePath(gcs);
  const repoName = `sigevents-list-${Date.now()}`;
  const repository = createGcsRepository({ bucket: gcs.bucket, basePath });

  try {
    repository.validate();
    await repository.register({ esClient, log, repoName });

    const result = await esClient.snapshot.get({
      repository: repoName,
      snapshot: '_all',
    });

    const names = (result.snapshots ?? []).map((s) => s.snapshot).filter(Boolean) as string[];
    log.info(
      `Found ${names.length} snapshot(s) in run "${SIGEVENTS_SNAPSHOT_RUN}": ${names.join(', ')}`
    );
    return names;
  } finally {
    try {
      await esClient.snapshot.deleteRepository({ name: repoName });
    } catch {
      log.debug('Failed to delete listing repository');
    }
  }
}
