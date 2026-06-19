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
import type { Detection } from '@kbn/streams-schema';
import type { GcsConfig } from './snapshot_run_config';
import { resolveBasePath } from './snapshot_run_config';
import { getSigeventsSnapshotDetectionsIndex } from './sigevents_detections_index';

const DETECTIONS_TEMP_INDEX_PREFIX = 'sigevents-replay-temp-detections';
const DETECTIONS_SEARCH_LIMIT = 1000;

/**
 * Restores sigevents-captured detection documents from a snapshot and returns
 * all {@link Detection} documents. The temp index is cleaned up before returning.
 */
export async function loadDetectionsFromSnapshot(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string,
  gcs: GcsConfig
): Promise<Detection[]> {
  const basePath = resolveBasePath(gcs);
  const repository = createGcsRepository({ bucket: gcs.bucket, basePath });
  const detectionsIndex = getSigeventsSnapshotDetectionsIndex(snapshotName);
  const tempIndex = `${DETECTIONS_TEMP_INDEX_PREFIX}-${randomUUID()}`;

  try {
    await esClient.indices.delete({ index: tempIndex, ignore_unavailable: true });

    const restoreResult = await restoreSnapshot({
      esClient,
      log,
      repository,
      snapshotName,
      indices: [detectionsIndex],
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
      size: DETECTIONS_SEARCH_LIMIT,
    });

    const detections: Detection[] = searchResult.hits.hits
      .map((hit) => hit._source as Detection)
      .filter(Boolean);

    log.info(
      `Loaded ${detections.length} detection document(s) from snapshot "${snapshotName}" (search limit: ${DETECTIONS_SEARCH_LIMIT})`
    );
    return detections;
  } finally {
    try {
      await esClient.indices.delete({ index: tempIndex, ignore_unavailable: true });
    } catch {
      log.debug(`Failed to delete temp detections index`);
    }
  }
}
