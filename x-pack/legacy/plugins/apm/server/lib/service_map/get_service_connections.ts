/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESClient } from '../helpers/es_client';
import {
  initServiceConnsScript,
  mapServiceConnsScript,
  combineServiceConnsScript,
  reduceServiceConnsScript
} from './service-connection-es-scripts';
import {
  TRACE_ID,
  PROCESSOR_EVENT
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
  const params = {
    index: targetApmIndices,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                [PROCESSOR_EVENT]: ['transaction', 'span']
              }
            },
            {
              terms: {
                [TRACE_ID]: traceIds
              }
            }
          ]
        }
      },
      aggs: {
        traces: {
          terms: {
            field: TRACE_ID,
            order: { _key: 'asc' as const },
            size: traceIds.length,
            execution_hint: 'map'
          },
          aggs: {
            connections: {
              scripted_metric: {
                init_script: initServiceConnsScript,
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
