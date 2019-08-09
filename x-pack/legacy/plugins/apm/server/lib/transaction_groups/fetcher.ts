/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  PROCESSOR_EVENT,
  PARENT_ID,
  TRANSACTION_SAMPLED,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../typings/common';
import { Setup } from '../helpers/setup_request';
import { rangeFilter } from '../helpers/range_filter';
import { BoolQuery } from '../../../typings/elasticsearch';

interface TopTransactionOptions {
  type: 'top_transactions';
  serviceName: string;
  transactionType: string;
}

interface TopTraceOptions {
  type: 'top_traces';
}

export type Options = TopTransactionOptions | TopTraceOptions;

export type ESResponse = PromiseReturnType<typeof transactionGroupsFetcher>;
export function transactionGroupsFetcher(options: Options, setup: Setup) {
  const { client, config, start, end, uiFiltersES } = setup;

  const bool: BoolQuery = {
    must_not: [],
    // prefer sampled transactions
    should: [{ term: { [TRANSACTION_SAMPLED]: true } }],
    filter: [
      { range: rangeFilter(start, end) },
      { term: { [PROCESSOR_EVENT]: 'transaction' } },
      ...uiFiltersES
    ]
  };

  if (options.type === 'top_traces') {
    // A transaction without `parent.id` is considered a "root" transaction, i.e. a trace
    bool.must_not.push({ exists: { field: PARENT_ID } });
  } else {
    bool.filter.push({ term: { [SERVICE_NAME]: options.serviceName } });
    bool.filter.push({ term: { [TRANSACTION_TYPE]: options.transactionType } });
  }

  const params = {
    index: config.get<string>('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: {
        bool
      },
      aggs: {
        transactions: {
          terms: {
            field: TRANSACTION_NAME,
            order: { sum: 'desc' },
            size: config.get<number>('xpack.apm.ui.transactionGroupBucketSize')
          },
          aggs: {
            sample: {
              top_hits: {
                size: 1,
                sort: [
                  { _score: 'desc' }, // sort by _score to ensure that buckets with sampled:true ends up on top
                  { '@timestamp': { order: 'desc' } }
                ]
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
  };

  return client.search(params);
}
