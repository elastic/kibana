/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository, restoreSnapshot } from '@kbn/es-snapshot-loader';
import type { Discovery } from '@kbn/streams-schema';
import type { GcsConfig } from './snapshot_run_config';
import { resolveBasePath } from './snapshot_run_config';
import { getSigeventsSnapshotDiscoveriesIndex } from './sigevents_discoveries_index';

const DISCOVERIES_TEMP_INDEX_PREFIX = 'sigevents-replay-temp-discoveries';
const DISCOVERIES_SEARCH_LIMIT = 1000;

/**
 * Restores sigevents-captured discovery documents from a snapshot and returns
 * all {@link Discovery} documents. The temp index is cleaned up before returning.
 */
export async function loadDiscoveriesFromSnapshot(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string,
  gcs: GcsConfig
): Promise<Discovery[]> {
  const basePath = resolveBasePath(gcs);
  const repository = createGcsRepository({ bucket: gcs.bucket, basePath });
  const discoveriesIndex = getSigeventsSnapshotDiscoveriesIndex(snapshotName);
  const tempIndex = `${DISCOVERIES_TEMP_INDEX_PREFIX}-${randomUUID()}`;

  try {
    await esClient.indices.delete({ index: tempIndex, ignore_unavailable: true });

    const restoreResult = await restoreSnapshot({
      esClient,
      log,
      repository,
      snapshotName,
      indices: [discoveriesIndex],
      renamePattern: '(.+)',
      renameReplacement: tempIndex,
      allowNoMatches: true,
    });

    if (!restoreResult.success) {
      throw new Error(
        `Failed to restore snapshot "${snapshotName}": ${restoreResult.errors.join('; ')}`
      );
    }

    if (restoreResult.restoredIndices.length === 0) {
      return [];
    }

    if (!restoreResult.restoredIndices.includes(tempIndex)) {
      throw new Error(
        `Snapshot "${snapshotName}" restore did not produce expected temp index "${tempIndex}". ` +
          `Restored indices: ${restoreResult.restoredIndices.join(', ')}`
      );
    }

    const searchResult = await esClient.search<Record<string, unknown>>({
      index: tempIndex,
      size: DISCOVERIES_SEARCH_LIMIT,
    });

    const discoveries: Discovery[] = searchResult.hits.hits
      .map((hit) => hit._source as Discovery)
      .filter(Boolean);

    log.info(
      `Loaded ${discoveries.length} discovery document(s) from snapshot "${snapshotName}" (search limit: ${DISCOVERIES_SEARCH_LIMIT})`
    );
    return discoveries;
  } finally {
    try {
      await esClient.indices.delete({ index: tempIndex, ignore_unavailable: true });
    } catch {
      log.debug(`Failed to delete temp discoveries index`);
    }
  }
}
