/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../common/constants';

const retryResponseStatuses = [
  401, // AuthorizationException
  403, // AuthenticationException
  408, // RequestTimeout
  410, // Gone
  429, // TooManyRequests -> ES circuit breaker
  503, // ServiceUnavailable
  504, // GatewayTimeout
];

/**
 * Returns true if the given elasticsearch error should be retried
 * by retry-based resiliency systems such as the SO migration, false otherwise.
 */
export const isRetryableEsClientError = (e: EsErrors.ElasticsearchClientError): boolean => {
  if (
    e instanceof EsErrors.NoLivingConnectionsError ||
    e instanceof EsErrors.ConnectionError ||
    e instanceof EsErrors.TimeoutError ||
    (e instanceof EsErrors.ResponseError &&
      ((e?.statusCode && retryResponseStatuses.includes(e?.statusCode)) ||
        // ES returns a 400 Bad Request when trying to close or delete an
        // index while snapshots are in progress. This should have been a 503
        // so once https://github.com/elastic/elasticsearch/issues/65883 is
        // fixed we can remove this.
        e?.body?.error?.type === 'snapshot_in_progress_exception'))
  ) {
    return true;
  }
  return false;
};

const MAX_BUCKETS_LIMIT = 65535;
export async function getAllSpacesWithCases(savedObjectsClient: SavedObjectsClientContract) {
  // This is one way to get all spaces that we want for case analytics purposes.
  // The advantage of this approach is that only spaces that actually contain cases are selected .
  // In turn that means that no unnecessary indices are created.
  // The disadvantage is that the query is an aggregation across the entire cluster and could be
  // slow in case there are many shards and a lot of cases.
  // The alternative is to query the list of all spaces in the cluster and thus creating extra
  // indices that might not be necessary.
  const spaces = await savedObjectsClient.find<
    unknown,
    {
      spaces: {
        buckets: Array<{
          key: string;
        }>;
      };
    }
  >({
    type: CASE_SAVED_OBJECT,
    page: 0,
    perPage: 0,
    namespaces: ['*'],
    aggs: {
      spaces: {
        terms: {
          // We want to make sure that we include all spaces, because `terms` aggregations
          // by default only return the top 10 results. `MAX_BUCKETS_LIMIT` is 65k.
          size: MAX_BUCKETS_LIMIT,
          field: `${CASE_SAVED_OBJECT}.namespaces`,
        },
      },
    },
  });
  return spaces.aggregations?.spaces.buckets.map((space) => space.key) ?? [];
}
