/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import moment from 'moment';
import { getErrorMessage } from '../../../common';
import { parseHistorySnapshotIndexDate } from '../asset_manager/history_snapshot_index';
import { resolveHistorySnapshotIndexPatterns } from '../asset_manager/resolve_entity_store_indices';

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
}: DeleteExpiredHistorySnapshotsParams): Promise<void> {
  if (abortSignal?.aborted) {
    return;
  }

  try {
    const patterns = await resolveHistorySnapshotIndexPatterns(esClient, namespace);

    const resolvedPerPattern = await Promise.all(
      patterns.map(async (pattern) => {
        const { indices } = await esClient.indices.resolveIndex(
          {
            name: pattern,
            ignore_unavailable: true,
            allow_no_indices: true,
          },
          { signal: abortSignal }
        );
        return indices.map((index) => index.name);
      })
    );

    const indices = resolvedPerPattern.flat();
    const expired = selectExpiredHistorySnapshotIndices(indices, retentionDays, now).slice(
      0,
      maxDeletes
    );

    const deleted: string[] = [];
    if (expired.length > 0) {
      const limit = pLimit(BATCH_CONCURRENCY_LIMIT);
      await Promise.all(
        chunkByUrlLength(indices).map((chunk) =>
          limit(() =>
            esClient.indices.delete({ index: chunk }, { signal: abortSignal, ignore: [404] })
          )
        )
      );
    }
  } catch (err) {
    logger.error(`history snapshot retention cleanup failed: ${getErrorMessage(err)}`);
  }
}
