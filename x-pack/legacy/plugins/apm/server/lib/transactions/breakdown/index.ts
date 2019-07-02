/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, sortByOrder } from 'lodash';
import {
  SERVICE_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  SPAN_SELF_TIME_SUM,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  TRANSACTION_BREAKDOWN_COUNT
} from '../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../typings/common';
import { Setup } from '../../helpers/setup_request';
import { rangeFilter } from '../../helpers/range_filter';
import { getMetricsDateHistogramParams } from '../../helpers/metrics';
import { MAX_KPIS } from './constants';

export type TransactionBreakdownAPIResponse = PromiseReturnType<
  typeof getTransactionBreakdown
>;

interface TimeseriesMap {
  [key: string]: Array<{ x: number; y: number | null }>;
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
        field: SPAN_SELF_TIME_SUM
      }
    },
    total_transaction_breakdown_count: {
      sum: {
        field: TRANSACTION_BREAKDOWN_COUNT
      }
    },
    types: {
      terms: {
        field: SPAN_TYPE,
        size: 20,
        order: {
          _count: 'desc'
        }
      },
      aggs: {
        subtypes: {
          terms: {
            field: SPAN_SUBTYPE,
            missing: '',
            size: 20,
            order: {
              _count: 'desc'
            }
          },
          aggs: {
            total_self_time_per_subtype: {
              sum: {
                field: SPAN_SELF_TIME_SUM
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
                [TRANSACTION_TYPE]: {
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
                      [TRANSACTION_NAME]: {
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

  const kpis = sortByOrder(
    formatBucket(resp.aggregations),
    'percentage',
    'desc'
  ).slice(0, MAX_KPIS);

  const kpiNames = kpis.map(kpi => kpi.name);

  const timeseriesPerSubtype = resp.aggregations.by_date.buckets.reduce(
    (prev, bucket) => {
      const formattedValues = formatBucket(bucket);
      const time = bucket.key;

      return kpiNames.reduce((p, kpiName) => {
        const value = formattedValues.find(val => val.name === kpiName) || {
          name: kpiName,
          percentage: null
        };

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

  return {
    kpis,
    timeseries_per_subtype: timeseriesPerSubtype
  };
}
