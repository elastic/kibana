/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  AggregationsMultiBucketAggregateBase,
  AggregationsTermsAggregateBase,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { ChangePointType } from '@kbn/es-types/src';
import type { StreamQueryKql, SignificantEventsGetResponse } from '@kbn/streams-schema';
import { get, isArray, isEmpty, keyBy } from 'lodash';
import type { QueryClient } from '../streams/assets/query/query_client';
import { getRuleIdFromQueryLink } from '../streams/assets/query/helpers/query';
import { SecurityError } from '../streams/errors/security_error';
import type { QueryLink } from '../../../common/queries';

export async function readSignificantEventsFromAlertsIndices(
  params: { streamNames?: string[]; from: Date; to: Date; bucketSize: string; query?: string },
  dependencies: {
    queryClient: QueryClient;
    scopedClusterClient: IScopedClusterClient;
  }
): Promise<SignificantEventsGetResponse> {
  const { queryClient, scopedClusterClient } = dependencies;
  const { streamNames = [], from, to, bucketSize, query } = params;

  const queryLinks = query
    ? await queryClient.findQueries(streamNames, query)
    : await queryClient.getQueryLinks(streamNames);

  if (isEmpty(queryLinks)) {
    return { significant_events: [], aggregated_occurrences: [] };
  }

  const queryLinkByRuleId = keyBy(queryLinks, (queryLink) => getRuleIdFromQueryLink(queryLink));
  const ruleIds = Object.keys(queryLinkByRuleId);

  const response = await scopedClusterClient.asCurrentUser
    .search<
      unknown,
      {
        aggregated_occurrences: AggregationsMultiBucketAggregateBase<{
          key_as_string: string;
          key: number;
          doc_count: number;
        }>;
        by_rule: AggregationsTermsAggregateBase<{
          key: string;
          doc_count: number;
          occurrences: AggregationsMultiBucketAggregateBase<{
            key_as_string: string;
            key: number;
            doc_count: 0;
          }>;
          change_points: {
            type: {
              [key in ChangePointType]: { p_value: number; change_point: number };
            };
          };
        }>;
      }
    >({
      index: '.alerts-streams.alerts-default',
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: from.toISOString(),
                  lte: to.toISOString(),
                },
              },
            },
            {
              terms: {
                'kibana.alert.rule.uuid': ruleIds,
              },
            },
          ],
        },
      },
      aggs: {
        aggregated_occurrences: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: bucketSize,
            extended_bounds: {
              min: from.toISOString(),
              max: to.toISOString(),
            },
          },
        },
        by_rule: {
          terms: {
            field: 'kibana.alert.rule.uuid',
            size: 10000,
          },
          aggs: {
            occurrences: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: bucketSize,
                extended_bounds: {
                  min: from.toISOString(),
                  max: to.toISOString(),
                },
              },
            },
            change_points: {
              // @ts-expect-error
              change_point: {
                buckets_path: 'occurrences>_count',
              },
            },
          },
        },
      },
    })
    .catch((err) => {
      const isResponseError = err instanceof errors.ResponseError;
      if (isResponseError && err?.body?.error?.type === 'security_exception') {
        throw new SecurityError(
          `Cannot read significant events, insufficient privileges: ${err.message}`,
          { cause: err }
        );
      }
      throw err;
    });

  if (!response.aggregations || !isArray(response.aggregations.by_rule.buckets)) {
    return {
      significant_events: queryLinks.map((queryLink) => ({
        ...toStreamQueryKql(queryLink),
        stream_name: queryLink.stream_name,
        occurrences: [],
        change_points: {
          type: {
            stationary: { p_value: 0, change_point: 0 },
          },
        },
      })),
      aggregated_occurrences: [],
    };
  }

  const aggregatedBuckets = response.aggregations.aggregated_occurrences.buckets;
  const aggregatedOccurrences = isArray(aggregatedBuckets)
    ? aggregatedBuckets.map((bucket) => ({ date: bucket.key_as_string, count: bucket.doc_count }))
    : [];

  const significantEvents = response.aggregations.by_rule.buckets.map((bucket) => {
    const ruleId = bucket.key;
    const queryLink = queryLinkByRuleId[ruleId];
    const occurrences = get(bucket, 'occurrences.buckets');
    const changePoints = get(bucket, 'change_points') ?? {};

    return {
      ...toStreamQueryKql(queryLink),
      stream_name: queryLink.stream_name,
      occurrences: isArray(occurrences)
        ? occurrences.map((occurrence) => ({
            date: occurrence.key_as_string,
            count: occurrence.doc_count,
          }))
        : [],
      change_points: changePoints,
    };
  });

  const foundSignificantEventsIds = significantEvents.map((event) => event.id);
  const notFoundSignificantEvents = queryLinks
    .filter((queryLink) => !foundSignificantEventsIds.includes(queryLink.query.id))
    .map((queryLink) => ({
      ...toStreamQueryKql(queryLink),
      stream_name: queryLink.stream_name,
      occurrences: [],
      change_points: {
        type: {
          stationary: { p_value: 0, change_point: 0 },
        },
      },
    }));

  return {
    significant_events: [...significantEvents, ...notFoundSignificantEvents],
    aggregated_occurrences: aggregatedOccurrences,
  };
}

const toStreamQueryKql = (queryLink: QueryLink): StreamQueryKql => {
  return {
    id: queryLink.query.id,
    title: queryLink.query.title,
    kql: queryLink.query.kql,
    feature: queryLink.query.feature,
    severity_score: queryLink.query.severity_score,
    evidence: queryLink.query.evidence,
  };
};
