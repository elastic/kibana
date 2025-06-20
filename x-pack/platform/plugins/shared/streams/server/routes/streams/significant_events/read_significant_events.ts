/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  AggregationsMultiBucketAggregateBase,
  AggregationsTermsAggregateBase,
} from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';
import { ChangePointType } from '@kbn/es-types/src';
import { SignificantEventsGetResponse } from '@kbn/streams-schema';
import { get, isArray, isEmpty, keyBy } from 'lodash';
import { AssetClient } from '../../../lib/streams/assets/asset_client';
import { getRuleIdFromQueryLink } from '../../../lib/streams/assets/query/helpers/query';
import { SecurityError } from '../../../lib/streams/errors/security_error';

export async function readSignificantEvents(
  params: { name: string; from: Date; to: Date; bucketSize: string },
  dependencies: {
    assetClient: AssetClient;
    scopedClusterClient: IScopedClusterClient;
  }
): Promise<SignificantEventsGetResponse> {
  const { assetClient, scopedClusterClient } = dependencies;
  const { name, from, to, bucketSize } = params;

  const queryLinks = await assetClient.getAssetLinks(name, ['query']);
  if (isEmpty(queryLinks)) {
    return [];
  }

  const queryLinkByRuleId = keyBy(queryLinks, (queryLink) => getRuleIdFromQueryLink(queryLink));
  const ruleIds = Object.keys(queryLinkByRuleId);

  const response = await scopedClusterClient.asCurrentUser
    .search<
      unknown,
      {
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
    return queryLinks.map((queryLink) => ({
      id: queryLink.query.id,
      title: queryLink.query.title,
      kql: queryLink.query.kql,
      occurrences: [],
      change_points: {
        type: {
          stationary: { p_value: 0, change_point: 0 },
        },
      },
    }));
  }

  const significantEvents = response.aggregations.by_rule.buckets.map((bucket) => {
    const ruleId = bucket.key;
    const queryLink = queryLinkByRuleId[ruleId];
    const occurrences = get(bucket, 'occurrences.buckets');
    const changePoints = get(bucket, 'change_points') ?? {};

    return {
      id: queryLink.query.id,
      title: queryLink.query.title,
      kql: queryLink.query.kql,
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
      id: queryLink.query.id,
      title: queryLink.query.title,
      kql: queryLink.query.kql,
      occurrences: [],
      change_points: {
        type: {
          stationary: { p_value: 0, change_point: 0 },
        },
      },
    }));

  return [...significantEvents, ...notFoundSignificantEvents];
}
