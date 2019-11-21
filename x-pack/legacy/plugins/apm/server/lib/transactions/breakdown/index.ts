/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, sortByOrder, last } from 'lodash';
import {
  SERVICE_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  SPAN_SELF_TIME_SUM,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  TRANSACTION_BREAKDOWN_COUNT,
  PROCESSOR_EVENT
} from '../../../../common/elasticsearch_fieldnames';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../helpers/setup_request';
import { rangeFilter } from '../../helpers/range_filter';
import { getMetricsDateHistogramParams } from '../../helpers/metrics';
import { MAX_KPIS } from './constants';
import { getVizColorForIndex } from '../../../../common/viz_colors';

export async function getTransactionBreakdown({
  setup,
  serviceName,
  transactionName,
  transactionType
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName: string;
  transactionName?: string;
  transactionType: string;
}) {
  const { uiFiltersES, client, start, end, indices } = setup;

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
          _count: 'desc' as const
        }
      },
      aggs: {
        subtypes: {
          terms: {
            field: SPAN_SUBTYPE,
            missing: '',
            size: 20,
            order: {
              _count: 'desc' as const
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
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [TRANSACTION_TYPE]: transactionType } },
    { term: { [PROCESSOR_EVENT]: 'metric' } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES
  ];

  if (transactionName) {
    filters.push({ term: { [TRANSACTION_NAME]: transactionName } });
  }

  const params = {
    index: indices['apm_oss.metricsIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: filters
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
      | Required<typeof resp>['aggregations']
      | Required<typeof resp>['aggregations']['by_date']['buckets'][0]
  ) => {
    const sumAllSelfTimes = aggs.sum_all_self_times.value || 0;

    const breakdowns = flatten(
      aggs.types.buckets.map(bucket => {
        const type = bucket.key as string;

        return bucket.subtypes.buckets.map(subBucket => {
          return {
            name: (subBucket.key as string) || type,
            percentage:
              (subBucket.total_self_time_per_subtype.value || 0) /
              sumAllSelfTimes
          };
        });
      })
    );

    return breakdowns;
  };

  const visibleKpis = resp.aggregations
    ? sortByOrder(formatBucket(resp.aggregations), 'percentage', 'desc').slice(
        0,
        MAX_KPIS
      )
    : [];

  const kpis = sortByOrder(visibleKpis, 'name').map((kpi, index) => {
    return {
      ...kpi,
      color: getVizColorForIndex(index)
    };
  });

  const kpiNames = kpis.map(kpi => kpi.name);

  const bucketsByDate = resp.aggregations?.by_date.buckets || [];

  const timeseriesPerSubtype = bucketsByDate.reduce((prev, bucket) => {
    const formattedValues = formatBucket(bucket);
    const time = bucket.key;

    const updatedSeries = kpiNames.reduce((p, kpiName) => {
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

    const lastValues = Object.values(updatedSeries).map(last);

    // If for a given timestamp, some series have data, but others do not,
    // we have to set any null values to 0 to make sure the stacked area chart
    // is drawn correctly.
    // If we set all values to 0, the chart always displays null values as 0,
    // and the chart looks weird.
    const hasAnyValues = lastValues.some(value => value.y !== null);
    const hasNullValues = lastValues.some(value => value.y === null);

    if (hasAnyValues && hasNullValues) {
      Object.values(updatedSeries).forEach(series => {
        const value = series[series.length - 1];
        const isEmpty = value.y === null;
        if (isEmpty) {
          // local mutation to prevent complicated map/reduce calls
          value.y = 0;
        }
      });
    }

    return updatedSeries;
  }, {} as Record<string, Array<{ x: number; y: number | null }>>);

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
