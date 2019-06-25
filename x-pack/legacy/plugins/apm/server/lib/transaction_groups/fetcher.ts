/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TRANSACTION_DURATION,
  TRANSACTION_NAME
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType, StringMap } from '../../../typings/common';
import { Setup } from '../helpers/setup_request';

export type ESResponse = PromiseReturnType<typeof transactionGroupsFetcher>;
export function transactionGroupsFetcher(setup: Setup, bodyQuery: StringMap) {
  const { client, config } = setup;
  const params = {
    index: config.get<string>('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: bodyQuery,
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
