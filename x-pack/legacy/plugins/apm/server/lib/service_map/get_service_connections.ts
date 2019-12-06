/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchClient } from '../helpers/es_client';

export async function getServiceConnections({
  apmIdxPattern,
  traceIds,
  searchClient
}: {
  apmIdxPattern: string;
  traceIds: string[];
  searchClient: SearchClient;
}) {
  const traceIdFilters = traceIds.map(traceId => ({
    term: { 'trace.id': traceId }
  }));
  const params = {
    index: apmIdxPattern,
    body: {
      size: 0,
      query: {
        bool: {
          should: [
            { exists: { field: 'span.id' } },
            { exists: { field: 'transaction.type' } },
            ...traceIdFilters
          ],
          minimum_should_match: 2
        }
      },
      aggs: {
        trace_id: {
          terms: {
            field: 'trace.id',
            order: { _key: 'asc' as const },
            size: traceIds.length
          },
          aggs: {
            connections: {
              scripted_metric: {
                init_script: 'state.spans = new HashMap();',
                map_script: { id: 'map-service-conns' },
                combine_script: { id: 'combine-service-conns' },
                reduce_script: { id: 'reduce-service-conns' }
              }
            }
          }
        }
      }
    }
  };
  const serviceConnectionsResponse = await searchClient(params);
  const traceConnectionsBuckets =
    serviceConnectionsResponse.aggregations?.trace_id.buckets ?? [];
  return traceConnectionsBuckets;
}
