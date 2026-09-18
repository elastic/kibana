/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  Signal,
  SignalGroup,
  ListSignalGroupsResponse,
  ListSignalsResponse,
} from '../../common/http_api/signals';
import { buildSignalsIndexName } from '../../common/http_api/signals';

/**
 * Reads run as free functions (rather than via `SignalsService`) because they need the
 * request-scoped `asCurrentUser` client, whereas the service holds a long-lived per-space
 * `asInternalUser` client used by the write path.
 */

/** Options shared by every read so a missing index yields an empty result rather than an error. */
const LENIENT_INDEX_OPTIONS = {
  ignore_unavailable: true,
  allow_no_indices: true,
} as const;

/** Fields never rendered by the UI are excluded from the per-group fetch. */
const SIGNAL_SOURCE_EXCLUDES = ['data.returned.columns'] as const;

interface TagsAggregation {
  tags: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
}

/**
 * Preaggregated grouped-by-tag list: a terms aggregation over the `tags` keyword field of the
 * current space's signals index. Returns one `{ tag, count }` per distinct tag, highest count first.
 */
export const getSignalGroups = async (
  esClient: ElasticsearchClient,
  { spaceId, maxGroups }: { spaceId: string; maxGroups: number }
): Promise<ListSignalGroupsResponse> => {
  const response = await esClient.search<unknown, TagsAggregation>({
    index: buildSignalsIndexName(spaceId),
    ...LENIENT_INDEX_OPTIONS,
    size: 0,
    track_total_hits: false,
    aggs: {
      tags: {
        terms: {
          field: 'tags',
          size: maxGroups,
          order: { _count: 'desc' },
        },
      },
    },
  });

  const buckets = response.aggregations?.tags?.buckets ?? [];
  const groups: SignalGroup[] = buckets.map((bucket) => ({
    tag: bucket.key,
    count: bucket.doc_count,
  }));

  return { groups };
};

/**
 * Fetches the individual signals carrying a given tag from the current space's index, newest first
 * and paginated. The evidence for each signal lives in its flattened `data` object.
 */
export const getSignalsByTag = async (
  esClient: ElasticsearchClient,
  { spaceId, tag, from, size }: { spaceId: string; tag: string; from: number; size: number }
): Promise<ListSignalsResponse> => {
  const response = await esClient.search<Signal>({
    index: buildSignalsIndexName(spaceId),
    ...LENIENT_INDEX_OPTIONS,
    from,
    size,
    track_total_hits: true,
    _source: { excludes: [...SIGNAL_SOURCE_EXCLUDES] },
    query: {
      bool: {
        filter: [{ term: { tags: tag } }],
      },
    },
    sort: [{ '@timestamp': { order: 'desc' } }],
  });

  const signals = response.hits.hits
    .map((hit) => hit._source)
    .filter((source): source is Signal => source != null);

  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? signals.length;

  return { signals, total };
};
