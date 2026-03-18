/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository, restoreSnapshot } from '@kbn/es-snapshot-loader';
import type { Feature } from '@kbn/streams-schema';
import type { GcsConfig } from './snapshot_run_config';
import { resolveBasePath } from './snapshot_run_config';
import { getSigeventsSnapshotKIsIndex } from './sigevents_kis_index';

export const KIS_TEMP_INDEX = 'sigevents-replay-temp-features';
const KIS_SEARCH_LIMIT = 1000;

/**
 * Restores sigevents-captured KIs from a snapshot and returns all
 * {@link Feature} documents for the given stream. The temp index is cleaned
 * up before returning.
 */
export async function loadKIsFromSnapshot(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string,
  gcs: GcsConfig,
  streamName: string = 'logs'
): Promise<Feature[]> {
  const basePath = resolveBasePath(gcs);
  const repository = createGcsRepository({ bucket: gcs.bucket, basePath });
  const kiIndex = getSigeventsSnapshotKIsIndex(snapshotName);

  try {
    await esClient.indices.delete({ index: KIS_TEMP_INDEX, ignore_unavailable: true });

    const restoreResult = await restoreSnapshot({
      esClient,
      log,
      repository,
      snapshotName,
      indices: [kiIndex],
      renamePattern: '(.+)',
      renameReplacement: KIS_TEMP_INDEX,
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

    if (!restoreResult.restoredIndices.includes(KIS_TEMP_INDEX)) {
      throw new Error(
        `Snapshot "${snapshotName}" restore did not produce expected temp index "${KIS_TEMP_INDEX}". ` +
          `Restored indices: ${restoreResult.restoredIndices.join(', ')}`
      );
    }

    const searchResult = await esClient.search<Record<string, unknown>>({
      index: KIS_TEMP_INDEX,
      size: KIS_SEARCH_LIMIT,
      query: { term: { stream_name: streamName } },
    });

    const kis: Feature[] = searchResult.hits.hits
      .map((hit) => hit._source as Feature)
      .filter(Boolean);

    log.info(
      `Loaded ${kis.length} KIs from snapshot "${snapshotName}" (search limit: ${KIS_SEARCH_LIMIT})`
    );
    return kis;
  } finally {
    try {
      await esClient.indices.delete({ index: KIS_TEMP_INDEX, ignore_unavailable: true });
    } catch {
      log.debug(`Failed to delete temp KIs index`);
    }
  }
}
