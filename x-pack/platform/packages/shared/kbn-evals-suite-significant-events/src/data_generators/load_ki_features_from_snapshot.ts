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
import type { Feature } from '@kbn/streams-schema';
import type { GcsConfig } from './snapshot_run_config';
import { resolveBasePath } from './snapshot_run_config';
import { getSigeventsSnapshotKIFeaturesIndex } from './sigevents_ki_features_index';

const KI_FEATURES_TEMP_INDEX_PREFIX = 'sigevents-replay-temp-features';
const KI_FEATURES_SEARCH_LIMIT = 1000;

/**
 * Restores sigevents-captured KI features from a snapshot and returns all
 * {@link Feature} documents for the given stream. The temp index is cleaned
 * up before returning.
 */
export async function loadKIFeaturesFromSnapshot(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string,
  gcs: GcsConfig,
  streamName: string = 'logs'
): Promise<Feature[]> {
  const basePath = resolveBasePath(gcs);
  const repository = createGcsRepository({ bucket: gcs.bucket, basePath });
  const kiFeaturesIndex = getSigeventsSnapshotKIFeaturesIndex(snapshotName);
  const tempIndex = `${KI_FEATURES_TEMP_INDEX_PREFIX}-${randomUUID()}`;

  try {
    await esClient.indices.delete({ index: tempIndex, ignore_unavailable: true });

    const restoreResult = await restoreSnapshot({
      esClient,
      log,
      repository,
      snapshotName,
      indices: [kiFeaturesIndex],
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
      size: KI_FEATURES_SEARCH_LIMIT,
      query: { term: { stream_name: streamName } },
    });

    const features: Feature[] = searchResult.hits.hits
      .map((hit) => hit._source as Feature)
      .filter(Boolean);

    log.info(
      `Loaded ${features.length} KI feature(s) from snapshot "${snapshotName}" (search limit: ${KI_FEATURES_SEARCH_LIMIT})`
    );
    return features;
  } finally {
    try {
      await esClient.indices.delete({ index: tempIndex, ignore_unavailable: true });
    } catch {
      log.debug(`Failed to delete temp KI features index`);
    }
  }
}
