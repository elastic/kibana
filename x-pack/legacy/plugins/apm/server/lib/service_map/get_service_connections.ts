/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESClient } from '../helpers/es_client';
import {
  mapServiceConnsScript,
  combineServiceConnsScript,
  reduceServiceConnsScript
} from './service-connection-es-scripts';
import {
  SPAN_ID,
  TRACE_ID,
  TRANSACTION_TYPE
} from '../../../common/elasticsearch_fieldnames';

export async function getServiceConnections({
  targetApmIndices,
  traceIds,
  esClient
}: {
  targetApmIndices: string[];
  traceIds: string[];
  esClient: ESClient;
}) {
  const traceIdFilters = traceIds.map(traceId => ({
    term: { [TRACE_ID]: traceId }
  }));
  const params = {
    index: targetApmIndices,
    body: {
      size: 0,
      query: {
        bool: {
          should: [
            { exists: { field: SPAN_ID } },
            { exists: { field: TRANSACTION_TYPE } },
            ...traceIdFilters
          ],
          minimum_should_match: 2
        }
      },
      aggs: {
        traces: {
          terms: {
            field: TRACE_ID,
            order: { _key: 'asc' as const },
            size: traceIds.length
          },
          aggs: {
            connections: {
              scripted_metric: {
                init_script: 'state.spans = new HashMap();',
                map_script: mapServiceConnsScript,
                combine_script: combineServiceConnsScript,
                reduce_script: reduceServiceConnsScript
              }
            }
          }
        }
      }
    }
  };
  const serviceConnectionsResponse = await esClient.search(params);
  const traceConnectionsBuckets =
    serviceConnectionsResponse.aggregations?.traces.buckets ?? [];
  return traceConnectionsBuckets;
}
