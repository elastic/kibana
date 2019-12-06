/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { SearchClient } from '../helpers/es_client';
import { Transaction } from '../../../typings/es_schemas/ui/Transaction';

export async function getNextTransactionSamples({
  apmIdxPattern,
  startTimeInterval,
  afterKey,
  searchClient
}: {
  apmIdxPattern: string;
  startTimeInterval: string;
  afterKey?: object;
  searchClient: SearchClient;
}) {
  const params = {
    index: apmIdxPattern,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { exists: { field: 'destination.address' } },
            { exists: { field: 'trace.id' } },
            { exists: { field: 'span.duration.us' } },
            { range: { '@timestamp': { gt: startTimeInterval } } }
          ]
        }
      },
      aggs: {
        'ext-conns': {
          composite: {
            sources: [
              { 'service.name': { terms: { field: 'service.name' } } },
              { 'span.type': { terms: { field: 'span.type' } } },
              {
                'span.subtype': {
                  terms: { field: 'span.subtype', missing_bucket: true }
                }
              },
              {
                'service.environment': {
                  terms: { field: 'service.environment', missing_bucket: true }
                }
              },
              {
                'destination.address': {
                  terms: { field: 'destination.address' }
                }
              }
            ],
            // TODO: needs to be balanced with the 20 below
            size: 200,
            after: afterKey
          },
          aggs: {
            smpl: {
              diversified_sampler: {
                composite: [] as never[], // TODO remove this
                shard_size: 20,
                script: {
                  lang: 'painless',
                  source: "(int)doc['span.duration.us'].value/100000"
                }
              },
              aggs: {
                tracesample: {
                  top_hits: {
                    size: 20,
                    _source: ['trace.id', '@timestamp']
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const transactionsResponse = await searchClient(params);
  const extConns = transactionsResponse.aggregations?.['ext-conns'];
  const buckets = extConns?.buckets ?? [];
  const sampleTraces = buckets.flatMap(bucket => {
    return bucket.smpl.tracesample.hits.hits.map(hit => {
      const transactionDoc = hit._source as Transaction;
      const traceId = transactionDoc.trace.id;
      const timestamp = parseInt(transactionDoc['@timestamp'], 10);
      return { traceId, timestamp };
    });
  });
  const latestTransactionTime = Math.max(
    ...sampleTraces.map(({ timestamp }) => timestamp)
  );
  const traceIds = uniq(sampleTraces.map(({ traceId }) => traceId));
  return {
    after_key: extConns?.after_key,
    latestTransactionTime,
    traceIds
  };
}
