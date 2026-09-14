/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import moment from 'moment';
import { getErrorMessage } from '../../../common';
import { deleteIndex } from '../../infra/elasticsearch';
import { hasCollidingNeutralNamespaceAssets } from '../asset_manager/migrate_legacy_security_assets';
import {
  getHistorySnapshotIndexPattern,
  getLegacySecurityHistorySnapshotIndexPattern,
  parseHistorySnapshotIndexDate,
} from '../asset_manager/history_snapshot_index';

export const MAX_EXPIRED_HISTORY_SNAPSHOTS_PER_RUN = 50;

export interface DeleteExpiredHistorySnapshotsParams {
  esClient: ElasticsearchClient;
  namespace: string;
  retentionDays: number;
  logger: Logger;
  abortSignal?: AbortSignal;
  now?: Date;
  maxDeletes?: number;
}

export interface DeleteExpiredHistorySnapshotsResult {
  deleted: string[];
}

/**
 * UTC calendar date (`YYYY-MM-DD`) at the start of the retention window.
 * Indices whose name date is strictly before this cutoff are expired.
 */
export const getHistorySnapshotRetentionCutoffDate = (now: Date, retentionDays: number): string =>
  moment.utc(now).subtract(retentionDays, 'days').format('YYYY-MM-DD');

/**
 * Returns expired history snapshot index names, oldest first.
 * Age is the UTC calendar date in the index name; the hour suffix is ignored.
 */
export const selectExpiredHistorySnapshotIndices = (
  indexNames: string[],
  retentionDays: number,
  now: Date
): string[] => {
  const cutoffDate = getHistorySnapshotRetentionCutoffDate(now, retentionDays);
  return indexNames
    .map((name) => ({ name, date: parseHistorySnapshotIndexDate(name) }))
    .filter(
      (item): item is { name: string; date: string } => item.date != null && item.date < cutoffDate
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
    .map((item) => item.name);
};

export async function deleteExpiredHistorySnapshots({
  esClient,
  namespace,
  retentionDays,
  logger,
  abortSignal,
  now = new Date(),
  maxDeletes = MAX_EXPIRED_HISTORY_SNAPSHOTS_PER_RUN,
}: DeleteExpiredHistorySnapshotsParams): Promise<DeleteExpiredHistorySnapshotsResult> {
  if (abortSignal?.aborted) {
    return { deleted: [] };
  }

  try {
    const colliding = await hasCollidingNeutralNamespaceAssets(esClient, namespace);
    const patterns = [
      getHistorySnapshotIndexPattern(namespace),
      ...(colliding ? [] : [getLegacySecurityHistorySnapshotIndexPattern(namespace)]),
    ];

    const indexNames = await resolveHistorySnapshotIndexNames(esClient, patterns, abortSignal);
    const expired = selectExpiredHistorySnapshotIndices(indexNames, retentionDays, now).slice(
      0,
      maxDeletes
    );

    const deleted: string[] = [];
    for (const indexName of expired) {
      if (abortSignal?.aborted) {
        break;
      }
      try {
        await deleteIndex(esClient, indexName, { signal: abortSignal });
        deleted.push(indexName);
      } catch (err) {
        logger.error(
          `failed to delete expired history snapshot index ${indexName}: ${getErrorMessage(err)}`
        );
      }
    }

    if (deleted.length > 0) {
      logger.debug(`deleted expired history snapshot indices: ${deleted.join(', ')}`);
    }

    return { deleted };
  } catch (err) {
    logger.error(`history snapshot retention cleanup failed: ${getErrorMessage(err)}`);
    return { deleted: [] };
  }
}

async function resolveHistorySnapshotIndexNames(
  esClient: ElasticsearchClient,
  patterns: string[],
  abortSignal?: AbortSignal
): Promise<string[]> {
  const resolvedNames = await Promise.all(
    patterns.map(async (pattern) => {
      try {
        const resolved = await esClient.indices.resolveIndex(
          { name: pattern },
          { signal: abortSignal }
        );
        return resolved.indices.map((index) => index.name);
      } catch {
        return [];
      }
    })
  );
  return [...new Set(resolvedNames.flat())];
}
