/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  getLatestEntitiesIndexName,
  getLegacySecurityLatestEntitiesIndexName,
} from '../../../common/domain/entity_index';
import {
  getUpdatesEntitiesDataStreamName,
  getLegacySecurityUpdatesEntitiesDataStreamName,
} from './updates_data_stream';
import {
  getMetadataEntitiesDataStreamName,
  getLegacySecurityMetadataEntitiesDataStreamName,
} from './metadata_data_stream';
import {
  hasCollidingNeutralNamespaceAssets,
  isConcreteIndexOrDataStream,
} from './migrate_legacy_security_assets';
import {
  getHistorySnapshotIndexPattern,
  getLegacySecurityHistorySnapshotIndexPattern,
} from './history_snapshot_index';

export interface EntityStoreWriteTargets {
  latestIndex: string;
  updatesDataStream: string;
  metadataDataStream: string;
}

/**
 * Resolves live read/write targets for a namespace.
 *
 * While a concrete legacy `.entities.v2.*.security_{namespace}` asset still exists,
 * that name is returned so traffic stays on the old index until migration deletes it.
 * After the old asset is gone (or never existed), the solution-neutral name is used.
 *
 * Collision: space `security_{namespace}` reuses the same concrete names. In that case
 * this namespace always uses the neutral names.
 */
export async function resolveEntityStoreWriteTargets(
  esClient: ElasticsearchClient,
  namespace: string
): Promise<EntityStoreWriteTargets> {
  const neutral: EntityStoreWriteTargets = {
    latestIndex: getLatestEntitiesIndexName(namespace),
    updatesDataStream: getUpdatesEntitiesDataStreamName(namespace),
    metadataDataStream: getMetadataEntitiesDataStreamName(namespace),
  };

  if (await hasCollidingNeutralNamespaceAssets(esClient, namespace)) {
    return neutral;
  }

  const legacyLatest = getLegacySecurityLatestEntitiesIndexName(namespace);
  const legacyUpdates = getLegacySecurityUpdatesEntitiesDataStreamName(namespace);
  const legacyMetadata = getLegacySecurityMetadataEntitiesDataStreamName(namespace);

  const [latestIsLegacy, updatesIsLegacy, metadataIsLegacy] = await Promise.all([
    isConcreteIndexOrDataStream(esClient, legacyLatest),
    isConcreteIndexOrDataStream(esClient, legacyUpdates),
    isConcreteIndexOrDataStream(esClient, legacyMetadata),
  ]);

  return {
    latestIndex: latestIsLegacy ? legacyLatest : neutral.latestIndex,
    updatesDataStream: updatesIsLegacy ? legacyUpdates : neutral.updatesDataStream,
    metadataDataStream: metadataIsLegacy ? legacyMetadata : neutral.metadataDataStream,
  };
}

export async function resolveLatestEntitiesIndexName(
  esClient: ElasticsearchClient,
  namespace: string
): Promise<string> {
  const { latestIndex } = await resolveEntityStoreWriteTargets(esClient, namespace);
  return latestIndex;
}

export async function resolveUpdatesDataStreamName(
  esClient: ElasticsearchClient,
  namespace: string
): Promise<string> {
  const { updatesDataStream } = await resolveEntityStoreWriteTargets(esClient, namespace);
  return updatesDataStream;
}

export async function resolveMetadataDataStreamName(
  esClient: ElasticsearchClient,
  namespace: string
): Promise<string> {
  const { metadataDataStream } = await resolveEntityStoreWriteTargets(esClient, namespace);
  return metadataDataStream;
}

/**
 * Returns the index patterns covering all history snapshot indices for a namespace,
 * including the legacy Security-scoped pattern while un-migrated snapshots may still
 * exist. History has no compatibility alias, so readers must query both patterns.
 *
 * Collision: legacy patterns for `namespace` equal neutral patterns for space
 * `security_{namespace}`. When that space owns live assets, only the neutral pattern
 * is returned so readers never see another space's snapshots.
 */
export async function resolveHistorySnapshotIndexPatterns(
  esClient: ElasticsearchClient,
  namespace: string
): Promise<string[]> {
  const neutral = getHistorySnapshotIndexPattern(namespace);
  if (await hasCollidingNeutralNamespaceAssets(esClient, namespace)) {
    return [neutral];
  }
  return [neutral, getLegacySecurityHistorySnapshotIndexPattern(namespace)];
}
