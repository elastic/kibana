/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { INDEX_NAMES, QUERY } from '../../../../common/constants';
import { parseFilterQuery, getFilterClause } from '../../helper';
import { UMElasticsearchQueryFn } from '../framework';
import { GetPingHistogramParams, HistogramResult } from '../../../../common/types';
import { HistogramQueryResult } from './types';

export const esGetPingHistogram: UMElasticsearchQueryFn<
  GetPingHistogramParams,
  HistogramResult
> = async ({ callES, dateStart, dateEnd, filters, monitorId, statusFilter }) => {
  const boolFilters = parseFilterQuery(filters);
  const additionalFilters = [];
  if (monitorId) {
    additionalFilters.push({ match: { 'monitor.id': monitorId } });
  }
  if (boolFilters) {
    additionalFilters.push(boolFilters);
  }
  const filter = getFilterClause(dateStart, dateEnd, additionalFilters);

  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      aggs: {
        timeseries: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: QUERY.DEFAULT_BUCKET_COUNT,
          },
          aggs: {
            down: {
              filter: {
                term: {
                  'monitor.status': 'down',
                },
              },
            },
            up: {
              filter: {
                term: {
                  'monitor.status': 'up',
                },
              },
            },
          },
        },
      },
    },
  };

  const result = await callES('search', params);
  const interval = result.aggregations.timeseries?.interval;
  const buckets: HistogramQueryResult[] = get(result, 'aggregations.timeseries.buckets', []);
  const histogram = buckets.map(bucket => {
    const x: number = get(bucket, 'key');
    const downCount: number = get(bucket, 'down.doc_count');
    const upCount: number = get(bucket, 'up.doc_count');
    return {
      x,
      downCount: statusFilter && statusFilter !== 'down' ? 0 : downCount,
      upCount: statusFilter && statusFilter !== 'up' ? 0 : upCount,
      y: 1,
    };
  });
  return {
    histogram,
    interval,
  };
};
