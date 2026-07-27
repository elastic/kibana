/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { BusEvent } from '../types';
import type { Cursor } from './cursor';

/** Raw datastream document shape. */
interface EventBusDoc {
  '@timestamp': string;
  event: { id: string; type: string };
  target: string | string[];
  source: string;
  space?: string;
  partition?: string;
  payload: unknown;
}

export interface ReadBatchParams {
  esClient: ElasticsearchClient;
  index: string;
  /** Consumer-specific filters (target, event.type, ...). */
  filter: estypes.QueryDslQueryContainer[];
  /** Current position, or null to start from `startTs`. */
  cursor: Cursor | null;
  /** Fallback lower bound (epoch millis) when there is no cursor yet. */
  startTs: number;
  /** Safety lag Δ in millis; only events with `@timestamp <= now - Δ` are read. */
  safetyLagMs: number;
  batchSize: number;
  signal?: AbortSignal;
}

export interface ReadBatchResult {
  events: Array<BusEvent<unknown>>;
  /** Position after the last returned event (unchanged if none returned). */
  nextCursor: Cursor | null;
  /** True if the batch was full — call again immediately to keep draining. */
  hasMore: boolean;
}

const SORT: estypes.Sort = [{ '@timestamp': 'asc' }, { 'event.id': 'asc' }];

const toBusEvent = (source: EventBusDoc): BusEvent<unknown> => ({
  id: source.event.id,
  type: source.event.type,
  target: source.target,
  source: source.source,
  space: source.space,
  partition: source.partition,
  payload: source.payload,
  timestamp: source['@timestamp'],
});

/**
 * Reads one batch from the datastream using range-filtered `search_after`.
 *
 * The explicit `@timestamp` range is a correctness/perf requirement, not an
 * optimization: the `lte: now - Δ` bound is the safety lag that stops the
 * cursor from skipping documents made searchable slightly out of order, and
 * the `gte` bound lets ES prune old backing indices/segments (search_after
 * alone does not). `track_total_hits: false` avoids counting on every poll.
 * Numeric bounds are interpreted by ES as epoch-millis on the date field.
 */
export const readBatch = async ({
  esClient,
  index,
  filter,
  cursor,
  startTs,
  safetyLagMs,
  batchSize,
  signal,
}: ReadBatchParams): Promise<ReadBatchResult> => {
  const nowMinusLag = Date.now() - safetyLagMs;
  const lowerBoundTs = cursor ? cursor[0] : startTs;
  const searchAfter: Cursor = cursor ?? [startTs, ''];

  const response = await esClient.search<EventBusDoc>(
    {
      index,
      size: batchSize,
      track_total_hits: false,
      sort: SORT,
      search_after: searchAfter,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: lowerBoundTs,
                  lte: nowMinusLag,
                },
              },
            },
            ...filter,
          ],
        },
      },
    },
    { signal }
  );

  const hits = response.hits.hits;
  const events = hits
    .map((hit) => hit._source)
    .filter((source): source is EventBusDoc => source != null)
    .map(toBusEvent);

  const lastSort = hits.length ? hits[hits.length - 1].sort : undefined;
  const nextCursor: Cursor | null =
    lastSort && lastSort.length >= 2 ? [Number(lastSort[0]), String(lastSort[1])] : cursor;

  return {
    events,
    nextCursor,
    hasMore: hits.length === batchSize,
  };
};
