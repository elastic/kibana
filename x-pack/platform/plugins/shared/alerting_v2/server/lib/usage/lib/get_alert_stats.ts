/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/datastreams/alert_events';
import { TERMS_SIZE, bucketsToRecord, bucketsToArray } from './constants';
import type { AlertStatsAggregations, AlertStatsResults } from './types';

export async function getAlertStats(esClient: ElasticsearchClient): Promise<AlertStatsResults> {
  const [searchResponse, statsResponse] = await Promise.all([
    esClient.search({
      index: ALERT_EVENTS_DATA_STREAM,
      size: 0,
      track_total_hits: true,
      ignore_unavailable: true,
      query: { match_all: {} },
      aggs: {
        count_by_kind: {
          terms: { field: 'status', size: TERMS_SIZE },
        },
        count_by_source: {
          terms: { field: 'source', size: TERMS_SIZE },
        },
        count_by_type: {
          terms: { field: 'type', size: TERMS_SIZE },
        },
        episode_count: {
          cardinality: { field: 'episode.id' },
        },
        min_timestamp: {
          min: { field: '@timestamp', format: 'strict_date_time' },
        },
      },
    }),
    esClient.indices.stats({ index: ALERT_EVENTS_DATA_STREAM, metric: 'store' }).catch(() => null),
  ]);

  const total =
    typeof searchResponse.hits.total === 'number'
      ? searchResponse.hits.total
      : searchResponse.hits.total?.value ?? 0;

  const aggs = searchResponse.aggregations as unknown as AlertStatsAggregations | undefined;

  const sizeBytes = statsResponse?._all?.total?.store?.size_in_bytes ?? null;

  return {
    alerts_count: total,
    alerts_count_by_kind: bucketsToRecord<'breached' | 'recovered' | 'no_data'>(
      aggs?.count_by_kind.buckets
    ),
    alerts_count_by_source: bucketsToArray(aggs?.count_by_source.buckets),
    alerts_count_by_type: bucketsToRecord<'signal' | 'alert'>(aggs?.count_by_type.buckets),
    alerts_episode_count: aggs?.episode_count.value ?? 0,
    alerts_min_timestamp: aggs?.min_timestamp.value_as_string ?? null,
    alerts_index_size_bytes: sizeBytes,
  };
}
