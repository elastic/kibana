/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import {
  MAX_STATS_STREAM_NAMES,
  type ResolvedDestinationIndex,
  type ResolvedDestinationIndexHealth,
} from '@kbn/streams-plugin/common';
import { isIlmLifecycle, type ClassicIngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import type { StreamsAppStartDependencies } from '../../../types';
import { calculateDataQuality } from '../../../util/calculate_data_quality';
import { lifecycleToRetentionMs } from '../../../util/lifecycle_to_retention_ms';

export interface DestinationIndexStatsTimeRange {
  start: number;
  end: number;
}

export interface DestinationIndexStatsRequest {
  timeRange: DestinationIndexStatsTimeRange;
  /** Reloads even when the time range is unchanged. */
  refresh?: boolean;
}

/** Per-index values of one bulk stats request; `undefined` when the request failed or was skipped. */
type StatsByIndex = Record<string, number> | undefined;

/** Stats of one destination's data streams. */
export interface DestinationIndexStats {
  timeRange: DestinationIndexStatsTimeRange;
  docs: StatsByIndex;
  degradedDocs: StatsByIndex;
  failedDocs: StatsByIndex;
  ingestedDocs: StatsByIndex;
  storageBytes: StatsByIndex;
}

export interface DestinationIndexRow {
  name: string;
  isDataStream: boolean;
  /** Stats are `undefined` when unknown: loading, failed, or not a data stream. */
  documents?: number;
  throughput?: number;
  storageBytes?: number;
  quality?: QualityIndicators;
  health?: ResolvedDestinationIndexHealth;
  failureStoreEnabled?: boolean;
  lifecycle?: ClassicIngestStreamEffectiveLifecycle;
  /** Retention for sorting: ILM and indefinite rank as the longest. */
  retentionMs: number;
}

export type DestinationIndexSortField =
  | 'name'
  | 'documents'
  | 'throughput'
  | 'storageBytes'
  | 'health'
  | 'quality'
  | 'failureStoreEnabled'
  | 'retentionMs';

export interface DestinationIndexSort {
  field: DestinationIndexSortField;
  direction: 'asc' | 'desc';
}

type StreamsRepositoryClient = StreamsAppStartDependencies['streams']['streamsRepositoryClient'];

const toChunks = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  );

/** Data streams whose failed documents can be counted: failure store enabled and readable. */
export const getReadableFailureStoreNames = (
  indices: readonly ResolvedDestinationIndex[]
): string[] =>
  indices.flatMap((index) =>
    index.is_data_stream && index.failure_store_enabled && index.privileges.read_failure_store
      ? [index.name]
      : []
  );

/**
 * Loads document, ingestion, quality, and storage stats for the given data streams only.
 * Names are sent in batches; the five stats of a batch load in parallel, batches one after another.
 * Failed documents are only requested for `failureStoreNames`, as one unreadable failure store
 * would fail the whole request. A stat is `undefined` when any of its batches failed.
 */
export const loadDestinationIndexStats = async ({
  streamsRepositoryClient,
  dataStreamNames,
  failureStoreNames,
  timeRange,
  signal,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  dataStreamNames: readonly string[];
  failureStoreNames: readonly string[];
  timeRange: DestinationIndexStatsTimeRange;
  signal: AbortSignal;
}): Promise<DestinationIndexStats> => {
  const readableFailureStores = new Set(failureStoreNames);
  const accumulated: Record<Exclude<keyof DestinationIndexStats, 'timeRange'>, StatsByIndex> = {
    docs: {},
    degradedDocs: {},
    failedDocs: {},
    ingestedDocs: {},
    storageBytes: {},
  };
  const collect = async (
    key: keyof typeof accumulated,
    request: () => Promise<Array<[string, number]>>
  ) => {
    if (!accumulated[key]) {
      return;
    }
    try {
      const entries = await request();
      const target = accumulated[key];
      if (target) {
        for (const [name, value] of entries) {
          target[name] = value;
        }
      }
    } catch {
      accumulated[key] = undefined;
    }
  };
  const toEntries = (stats: Array<{ stream: string; count: number }>): Array<[string, number]> =>
    stats.map(({ stream, count }) => [stream, count]);

  for (const streams of toChunks(dataStreamNames, MAX_STATS_STREAM_NAMES)) {
    if (signal.aborted) {
      break;
    }
    const rangeBody = { start: timeRange.start, end: timeRange.end, streams };
    const failureStreams = streams.filter((name) => readableFailureStores.has(name));
    await Promise.all([
      collect('docs', async () =>
        toEntries(
          await streamsRepositoryClient.fetch('POST /internal/streams/doc_counts/total', {
            signal,
            params: { body: { streams } },
          })
        )
      ),
      collect('degradedDocs', async () =>
        toEntries(
          await streamsRepositoryClient.fetch('POST /internal/streams/doc_counts/degraded', {
            signal,
            params: { body: { streams } },
          })
        )
      ),
      collect('failedDocs', async () =>
        failureStreams.length > 0
          ? toEntries(
              await streamsRepositoryClient.fetch('POST /internal/streams/doc_counts/failed', {
                signal,
                params: { body: { ...rangeBody, streams: failureStreams } },
              })
            )
          : []
      ),
      collect('ingestedDocs', async () =>
        toEntries(
          await streamsRepositoryClient.fetch('POST /internal/streams/doc_counts/ingestion', {
            signal,
            params: { body: rangeBody },
          })
        )
      ),
      collect('storageBytes', async () =>
        (
          await streamsRepositoryClient.fetch('POST /internal/streams/storage_stats', {
            signal,
            params: { body: { streams } },
          })
        ).map(({ stream, store_size_bytes: sizeBytes }): [string, number] => [stream, sizeBytes])
      ),
    ]);
  }

  return { timeRange, ...accumulated };
};

const getIndexQuality = (
  index: Extract<ResolvedDestinationIndex, { is_data_stream: true }>,
  stats: DestinationIndexStats
): QualityIndicators | undefined => {
  const { docs, degradedDocs, failedDocs } = stats;
  // A disabled failure store has no failed documents, so they are known to be zero.
  const failedDocsKnown =
    !index.failure_store_enabled || (index.privileges.read_failure_store && failedDocs);
  if (!docs || !degradedDocs || !failedDocsKnown) {
    return undefined;
  }
  return calculateDataQuality({
    totalDocs: docs[index.name] ?? 0,
    degradedDocs: degradedDocs[index.name] ?? 0,
    failedDocs: index.failure_store_enabled ? failedDocs?.[index.name] ?? 0 : 0,
  });
};

/** Joins resolved indices with the loaded stats into table rows. */
export const buildDestinationIndexRows = (
  indices: readonly ResolvedDestinationIndex[],
  stats: DestinationIndexStats | undefined
): DestinationIndexRow[] => {
  const timeRangeSec = stats ? (stats.timeRange.end - stats.timeRange.start) / 1000 : 0;
  return indices.map((index): DestinationIndexRow => {
    if (!index.is_data_stream) {
      return { name: index.name, isDataStream: false, retentionMs: 0 };
    }
    const ingested = stats?.ingestedDocs;
    return {
      name: index.name,
      isDataStream: true,
      documents: stats?.docs ? stats.docs[index.name] ?? 0 : undefined,
      throughput:
        ingested && timeRangeSec > 0 ? (ingested[index.name] ?? 0) / timeRangeSec : undefined,
      storageBytes: stats?.storageBytes ? stats.storageBytes[index.name] ?? 0 : undefined,
      quality: stats ? getIndexQuality(index, stats) : undefined,
      health: index.health,
      failureStoreEnabled: index.failure_store_enabled,
      lifecycle: index.lifecycle,
      retentionMs: isIlmLifecycle(index.lifecycle)
        ? Number.POSITIVE_INFINITY
        : lifecycleToRetentionMs(index.lifecycle) ?? 0,
    };
  });
};

const HEALTH_RANK: Record<ResolvedDestinationIndexHealth, number> = { red: 0, yellow: 1, green: 2 };
const QUALITY_RANK: Record<QualityIndicators, number> = { poor: 0, degraded: 1, good: 2 };

const getSortValue = (
  row: DestinationIndexRow,
  field: DestinationIndexSortField
): string | number | undefined => {
  switch (field) {
    case 'name':
      return row.name;
    case 'health':
      return row.health ? HEALTH_RANK[row.health] : undefined;
    case 'quality':
      return row.quality ? QUALITY_RANK[row.quality] : undefined;
    case 'failureStoreEnabled':
      return row.failureStoreEnabled === undefined ? undefined : Number(row.failureStoreEnabled);
    default:
      return row[field];
  }
};

/** Sorts rows in memory; unknown values always sort last, ties fall back to the name. */
export const sortDestinationIndexRows = (
  rows: readonly DestinationIndexRow[],
  { field, direction }: DestinationIndexSort
): DestinationIndexRow[] => {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const aValue = getSortValue(a, field);
    const bValue = getSortValue(b, field);
    if (aValue === undefined || bValue === undefined) {
      if (aValue !== bValue) {
        return aValue === undefined ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    }
    const order =
      typeof aValue === 'string' && typeof bValue === 'string'
        ? aValue.localeCompare(bValue)
        : Number(aValue > bValue) - Number(aValue < bValue);
    return order === 0 ? a.name.localeCompare(b.name) : order * multiplier;
  });
};
