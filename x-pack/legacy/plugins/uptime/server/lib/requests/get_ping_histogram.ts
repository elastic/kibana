/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { HistogramResult } from '../../../common/domain_types';
import {
  getHistogramInterval,
  parseFilterQuery,
  getFilterClause,
  getHistogramIntervalFormatted,
} from '../helper';
import { INDEX_NAMES } from '../../../common/constants';

export interface GetPingHistogramParams {
  /** @member dateRangeStart timestamp bounds */
  dateRangeStart: string;
  /** @member dateRangeEnd timestamp bounds */
  dateRangeEnd: string;
  /** @member filters user-defined filters */
  filters?: string | null;
  /** @member monitorId optional limit to monitorId */
  monitorId?: string | null;
  /** @member statusFilter special filter targeting the latest status of each monitor */
  statusFilter?: string | null;
}

export const getPingHistogram: UMElasticsearchQueryFn<
  GetPingHistogramParams,
  HistogramResult
> = async ({ callES, dateRangeStart, dateRangeEnd, filters, monitorId, statusFilter }) => {
  const boolFilters = parseFilterQuery(filters);
  const additionalFilters = [];
  if (monitorId) {
    additionalFilters.push({ match: { 'monitor.id': monitorId } });
  }
  if (boolFilters) {
    additionalFilters.push(boolFilters);
  }
  const filter = getFilterClause(dateRangeStart, dateRangeEnd, additionalFilters);
  const interval = getHistogramInterval(dateRangeStart, dateRangeEnd);
  const intervalFormatted = getHistogramIntervalFormatted(dateRangeStart, dateRangeEnd);

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
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalFormatted,
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
  const buckets: any[] = result?.aggregations?.timeseries?.buckets ?? [];
  const histogram = buckets.map(bucket => {
    const x: number = bucket.key;
    const downCount: number = bucket.down.doc_count;
    const upCount: number = bucket.up.doc_count;
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
