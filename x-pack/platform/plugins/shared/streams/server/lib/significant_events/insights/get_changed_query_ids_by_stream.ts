/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsTermsAggregateBase } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChangePointType } from '@kbn/es-types/src';
import { get, isArray, keyBy } from 'lodash';
import type { QueryClient } from '../../streams/assets/query/query_client';
import { getRuleIdFromQueryLink } from '../../streams/assets/query/helpers/query';

const ALERTS_INDEX = '.alerts-streams.alerts-default';
const CHANGE_POINT_BUCKET_INTERVAL = '30s';

/** Change point types that indicate "no change" — exclude these when deciding if a query has changed. */
const NO_CHANGE_TYPES: Set<string> = new Set(['stationary', 'indeterminable']);

/**
 * Resolves all query links for the given stream names, then runs a single ES DSL search:
 * terms filter on rule UUIDs, date_histogram per rule, change_point aggregation on the histogram.
 * Returns changed query IDs grouped by stream name (stream -> set of query IDs with at least one change point).
 */
// https://github.com/elastic/elasticsearch/issues/124723
export async function getChangedQueryIdsByStream({
  queryClient,
  esClient,
  streamNames,
  from,
  to,
  signal,
  logger,
}: {
  queryClient: QueryClient;
  esClient: ElasticsearchClient;
  streamNames: string[];
  /** Start of the time range (ISO 8601). Elasticsearch accepts this for date range gte/lte. */
  from: string;
  /** End of the time range (ISO 8601). Elasticsearch accepts this for date range gte/lte. */
  to: string;
  signal: AbortSignal;
  logger: Logger;
}): Promise<Map<string, Set<string>>> {
  const queryLinks = await queryClient.getQueryLinks(streamNames);
  if (queryLinks.length === 0) {
    return new Map();
  }

  const queryLinkByRuleId = keyBy(queryLinks, (link) => getRuleIdFromQueryLink(link));
  const ruleIds = Object.keys(queryLinkByRuleId);

  logger.debug(`Checking ${ruleIds.length} queries for changes`);

  const response = await esClient.search<
    unknown,
    {
      by_rule: AggregationsTermsAggregateBase<{
        key: string;
        doc_count: number;
        occurrences: unknown;
        change_points: {
          type?: Record<ChangePointType, { p_value?: number; change_point?: number }>;
        };
      }>;
    }
  >(
    {
      index: ALERTS_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: from,
                  lte: to,
                },
              },
            },
            { terms: { 'kibana.alert.rule.uuid': ruleIds } },
          ],
        },
      },
      aggs: {
        by_rule: {
          terms: { field: 'kibana.alert.rule.uuid', size: 10_000 },
          aggs: {
            occurrences: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: CHANGE_POINT_BUCKET_INTERVAL,
                extended_bounds: { min: from, max: to },
              },
            },
            change_points: {
              // change_point aggregation not in official ES types yet
              change_point: { buckets_path: 'occurrences>_count' },
            } as Record<string, unknown>,
          },
        },
      },
    },
    { signal }
  );

  const buckets = get(response, 'aggregations.by_rule.buckets');
  if (!isArray(buckets)) {
    return new Map();
  }

  const changedIdsByStream = new Map<string, Set<string>>();
  for (const bucket of buckets) {
    const ruleId = bucket.key as string;
    const queryLink = queryLinkByRuleId[ruleId];

    const changePoints = get(bucket, 'change_points');
    if (hasAnyChangePoint(changePoints)) {
      const streamName = queryLink.stream_name;
      let set = changedIdsByStream.get(streamName);
      if (!set) {
        set = new Set<string>();
        changedIdsByStream.set(streamName, set);
      }
      set.add(queryLink.query.id);
    }
  }
  return changedIdsByStream;
}

function hasAnyChangePoint(changePoints: { type?: Record<string, unknown> } | null): boolean {
  const types = changePoints?.type;
  if (!types || typeof types !== 'object') return false;
  return Object.keys(types).some((k) => !NO_CHANGE_TYPES.has(k));
}
