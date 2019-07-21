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
import { MAX_KPIS, COLORS } from './constants';

export type TransactionBreakdownAPIResponse = PromiseReturnType<
  typeof getTransactionBreakdown
>;

export async function getTransactionBreakdown({
  setup,
  serviceName,
  transactionName,
  transactionType
}: {
  setup: Setup;
  serviceName: string;
  transactionName?: string;
  transactionType: string;
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

  const filters = [
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
          value: transactionType
        }
      }
    },
    { range: rangeFilter(start, end) },
    ...uiFiltersES
  ];

  if (transactionName) {
    filters.push({ term: { [TRANSACTION_NAME]: { value: transactionName } } });
  }

  const params = {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          must: filters
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

  const visibleKpis = sortByOrder(
    formatBucket(resp.aggregations),
    'percentage',
    'desc'
  ).slice(0, MAX_KPIS);

  const kpis = sortByOrder(visibleKpis, 'name').map((kpi, index) => {
    return {
      ...kpi,
      color: COLORS[index % COLORS.length]
    };
  });

  const kpiNames = kpis.map(kpi => kpi.name);

  const timeseriesPerSubtype = resp.aggregations.by_date.buckets.reduce(
    (prev, bucket) => {
      const formattedValues = formatBucket(bucket);
      const time = bucket.key;

      return kpiNames.reduce((p, kpiName) => {
        const { name, percentage } = formattedValues.find(
          val => val.name === kpiName
        ) || {
          name: kpiName,
          percentage: null
        };

        if (!p[name]) {
          p[name] = [];
        }
        return {
          ...p,
          [name]: p[name].concat({
            x: time,
            y: percentage
          })
        };
      }, prev);
    },
    {} as Record<string, Array<{ x: number; y: number | null }>>
  );

  const timeseries = kpis.map(kpi => ({
    title: kpi.name,
    color: kpi.color,
    type: 'areaStacked',
    data: timeseriesPerSubtype[kpi.name],
    hideLegend: true
  }));

  return {
    kpis,
    timeseries
  };
}
