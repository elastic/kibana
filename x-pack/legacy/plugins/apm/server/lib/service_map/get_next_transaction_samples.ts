/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { ESClient } from '../helpers/es_client';
import { Transaction } from '../../../typings/es_schemas/ui/Transaction';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  DESTINATION_ADDRESS,
  TRACE_ID,
  SPAN_DURATION,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  TIMESTAMP
} from '../../../common/elasticsearch_fieldnames';

export async function getNextTransactionSamples({
  targetApmIndices,
  startTimeInterval,
  afterKey,
  esClient
}: {
  targetApmIndices: string[];
  startTimeInterval: string | number;
  afterKey?: object;
  esClient: ESClient;
}) {
  const params = {
    index: targetApmIndices,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { exists: { field: DESTINATION_ADDRESS } },
            { exists: { field: TRACE_ID } },
            { exists: { field: SPAN_DURATION } },
            { range: { [TIMESTAMP]: { gt: startTimeInterval } } }
          ]
        }
      },
      aggs: {
        externalConnections: {
          composite: {
            sources: [
              { [SERVICE_NAME]: { terms: { field: SERVICE_NAME } } },
              { [SPAN_TYPE]: { terms: { field: SPAN_TYPE } } },
              {
                [SPAN_SUBTYPE]: {
                  terms: { field: SPAN_SUBTYPE, missing_bucket: true }
                }
              },
              {
                [SERVICE_ENVIRONMENT]: {
                  terms: { field: SERVICE_ENVIRONMENT, missing_bucket: true }
                }
              },
              {
                [DESTINATION_ADDRESS]: {
                  terms: { field: DESTINATION_ADDRESS }
                }
              }
            ],
            // TODO: needs to be balanced with the 20 below
            size: 200,
            after: afterKey
          },
          aggs: {
            smpl: {
              // get sample within a 0.1 second range
              diversified_sampler: {
                shard_size: 20,
                script: {
                  lang: 'painless',
                  source: `(int)doc['${SPAN_DURATION}'].value/100000`
                }
              },
              aggs: {
                tracesample: {
                  top_hits: {
                    size: 20,
                    _source: [TRACE_ID, TIMESTAMP]
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const transactionsResponse = await esClient.search(params);
  const externalConnections =
    transactionsResponse.aggregations?.externalConnections;
  const buckets = externalConnections?.buckets ?? [];
  const sampleTraces = buckets.flatMap(bucket => {
    return bucket.smpl.tracesample.hits.hits.map(hit => {
      const transactionDoc = hit._source as Transaction;
      const traceId = transactionDoc.trace.id;
      const timestamp = Date.parse(transactionDoc[TIMESTAMP]);
      return { traceId, timestamp };
    });
  });
  const latestTransactionTime = Math.max(
    ...sampleTraces.map(({ timestamp }) => timestamp)
  );
  const traceIds = uniq(sampleTraces.map(({ traceId }) => traceId));
  return {
    after_key: externalConnections?.after_key,
    latestTransactionTime,
    traceIds
  };
}
