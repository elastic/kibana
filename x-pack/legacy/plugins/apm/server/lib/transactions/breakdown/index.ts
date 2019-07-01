/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, pick } from 'lodash';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../typings/common';
import { Setup } from '../../helpers/setup_request';
import { rangeFilter } from '../../helpers/range_filter';
import { getMetricsDateHistogramParams } from '../../helpers/metrics';

export type TransactionBreakdownAPIResponse = PromiseReturnType<
  typeof getTransactionBreakdown
>;

interface TimeseriesMap {
  [key: string]: Array<{ x: number; y: number }>;
}

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

  const subAggs = {
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
        field: 'span.type',
        size: 20,
        order: {
          _count: 'desc'
        }
      },
      aggs: {
        subtypes: {
          terms: {
            field: 'span.subtype',
            missing: '',
            size: 20,
            order: {
              _count: 'desc'
            }
          },
          aggs: {
            total_self_time_per_subtype: {
              sum: {
                field: 'span.self_time.sum.us'
              }
            }
          }
        }
      }
    }
  };

  const params = {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          must: [
            {
              term: {
                [SERVICE_NAME]: {
                  value: serviceName
                }
              }
            },
            {
              term: {
                'transaction.type': {
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
                      'transaction.name': {
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
        ...subAggs,
        by_date: {
          date_histogram: getMetricsDateHistogramParams(start, end),
          aggs: subAggs
        }
      }
    }
  };

  const resp = await client.search(params);

  const formatBucket = (
    aggs:
      | typeof resp['aggregations']
      | typeof resp['aggregations']['by_date']['buckets'][0]
  ) => {
    const sumAllSelfTimes = aggs.sum_all_self_times.value || 0;

    const breakdowns = flatten(
      aggs.types.buckets.map(bucket => {
        const type = bucket.key;

        return bucket.subtypes.buckets.map(subBucket => {
          return {
            name: subBucket.key || type,
            percentage:
              (subBucket.total_self_time_per_subtype.value || 0) /
              sumAllSelfTimes
          };
        });
      })
    );

    return breakdowns;
  };

  const total = formatBucket(resp.aggregations);

  const timeseriesPerSubtype = resp.aggregations.by_date.buckets.reduce(
    (prev, bucket) => {
      const formattedValues = formatBucket(bucket);
      const time = bucket.key;

      return formattedValues.reduce((p, value) => {
        const { name, percentage } = value;
        if (!p[name]) {
          p[name] = [];
        }
        return {
          ...p,
          [value.name]: p[name].concat({ x: time, y: percentage })
        };
      }, prev);
    },
    {} as TimeseriesMap
  );

  const filteredTimeseriesPerSubtype = pick(
    timeseriesPerSubtype,
    (timeserie, key) => total.find(kpi => kpi.name === key)
  ) as TimeseriesMap;

  return {
    total,
    timeseries_per_subtype: filteredTimeseriesPerSubtype
  };
}
