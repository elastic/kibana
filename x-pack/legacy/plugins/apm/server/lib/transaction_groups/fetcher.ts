/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TRANSACTION_DURATION,
  TRANSACTION_SAMPLED
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../typings/common';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../helpers/setup_request';
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
export function transactionGroupsFetcher(
  options: Options,
  setup: Setup & SetupTimeRange & SetupUIFilters
) {
  const { client, config } = setup;

  const projection = getTransactionGroupsProjection({
    setup,
    options
  });

  const sort: SortOptions = [
    { _score: 'desc' as const }, // sort by _score to ensure that buckets with sampled:true ends up on top
    { '@timestamp': { order: 'desc' as const } }
  ];

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          // prefer sampled transactions
          should: [{ term: { [TRANSACTION_SAMPLED]: true } }]
        }
      },
      aggs: {
        transactions: {
          terms: {
            ...projection.body.aggs.transactions.terms,
            order: { sum: 'desc' as const },
            size: config['xpack.apm.ui.transactionGroupBucketSize']
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
  });

  return client.search<Transaction, typeof params>(params);
}
