/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TRANSACTION_DURATION,
  TRANSACTION_SAMPLED,
  PARENT_ID
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../typings/common';
import { Setup } from '../helpers/setup_request';
import { getTransactionGroupsProjection } from '../../../common/projections/transaction_groups';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import { SortOptions } from '../../../typings/elasticsearch/aggregations';
import { Transaction } from '../../../typings/es_schemas/ui/Transaction';

interface TopTransactionOptions {
  type: 'top_transactions';
  serviceName: string;
  transactionType: string;
  transactionName?: string;
}

interface TopTraceOptions {
  type: 'top_traces';
  transactionName?: string;
}

export type Options = TopTransactionOptions | TopTraceOptions;

export type ESResponse = PromiseReturnType<typeof transactionGroupsFetcher>;
export function transactionGroupsFetcher(options: Options, setup: Setup) {
  const { client, config } = setup;

  const projection = getTransactionGroupsProjection({
    setup,
    options
  });

  const sort: SortOptions = [
    { _score: 'desc' as const }, // sort by _score to ensure that buckets with sampled:true ends up on top
    { '@timestamp': { order: 'desc' as const } }
  ];

  const bool =
    options.type === 'top_traces'
      ? {
          must_not: {
            exists: {
              field: PARENT_ID
            }
          }
        }
      : {};

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        transactions: {
          terms: {
            ...projection.body.aggs.transactions.terms,
            size: config.get<number>('xpack.apm.ui.transactionGroupBucketSize'),
            order: {
              'filtered_transactions>sum': 'desc'
            }
          },
          aggs: {
            select: {
              bucket_selector: {
                buckets_path: {
                  filtered_transactions_count: 'filtered_transactions._count'
                },
                script: 'params.filtered_transactions_count > 0'
              }
            },
            filtered_transactions: {
              filter: {
                bool: {
                  ...bool,
                  should: [{ term: { [TRANSACTION_SAMPLED]: true } }]
                }
              },
              aggs: {
                sample: {
                  top_hits: {
                    size: 1,
                    sort
                  }
                },
                avg: { avg: { field: TRANSACTION_DURATION } },
                p95: {
                  percentiles: { field: TRANSACTION_DURATION, percents: [95] }
                },
                sum: { sum: { field: TRANSACTION_DURATION } }
              }
            }
          }
        }
      }
    }
  });

  return client.search<Transaction, typeof params>(params);
}
