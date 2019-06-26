/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { PromiseReturnType } from '../../../../typings/common';
import { Setup } from '../../helpers/setup_request';
import { rangeFilter } from '../../helpers/range_filter';

export type TransactionBreakdownAPIResponse = PromiseReturnType<
  typeof getTransactionBreakdown
>;

export async function getTransactionBreakdown({
  setup,
  serviceName,
  transactionName
}: {
  setup: Setup;
  serviceName: string;
  transactionName?: string;
}) {
  const { uiFiltersES, client, config, start, end } = setup;

  const params = {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          must: [
            {
              term: {
                'service.name.keyword': {
                  value: serviceName
                }
              }
            },
            {
              term: {
                'transaction.type.keyword': {
                  value: 'request'
                }
              }
            },
            { range: rangeFilter(start, end) },
            ...uiFiltersES,
            ...(transactionName
              ? [
                  {
                    term: {
                      'transaction.name.keyword': {
                        value: transactionName
                      }
                    }
                  }
                ]
              : [])
          ]
        }
      },
      aggs: {
        sum_all_self_times: {
          sum: {
            field: 'span.self_time.sum.us'
          }
        },
        total_transaction_breakdown_count: {
          sum: {
            field: 'transaction.breakdown.count'
          }
        },
        types: {
          terms: {
            field: 'span.type.keyword',
            size: 42
          },
          aggs: {
            subtypes: {
              terms: {
                field: 'span.subtype.keyword',
                missing: '',
                size: 42
              },
              aggs: {
                total_self_time_per_subtype: {
                  sum: {
                    field: 'span.self_time.sum.us'
                  }
                },
                total_span_count_per_subtype: {
                  sum: {
                    field: 'span.self_time.count'
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const resp = await client.search(params);

  const sumAllSelfTimes = resp.aggregations.sum_all_self_times.value || 0;

  const breakdowns = flatten(
    resp.aggregations.types.buckets.map(bucket => {
      const type = bucket.key;

      return bucket.subtypes.buckets.map(subBucket => {
        return {
          name: subBucket.key || type,
          percentage:
            (subBucket.total_self_time_per_subtype.value || 0) /
            sumAllSelfTimes,
          count: subBucket.total_span_count_per_subtype.value || 0
        };
      });
    })
  );

  return breakdowns;
}
