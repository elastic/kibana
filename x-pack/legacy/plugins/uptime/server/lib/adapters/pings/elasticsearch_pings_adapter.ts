/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import { HttpBody, Ping, PingResults } from '../../../../common/graphql/types';
import { parseFilterQuery, getFilterClause, getHistogramIntervalFormatted } from '../../helper';
import { UMPingsAdapter, HistogramQueryResult } from './adapter_types';
import { getHistogramInterval } from '../../helper/get_histogram_interval';

export const elasticsearchPingsAdapter: UMPingsAdapter = {
  getAll: async ({
    callES,
    dateRangeStart,
    dateRangeEnd,
    monitorId,
    status,
    sort,
    size,
    location,
  }) => {
    const sortParam = { sort: [{ '@timestamp': { order: sort ?? 'desc' } }] };
    const sizeParam = size ? { size } : undefined;
    const filter: any[] = [{ range: { '@timestamp': { gte: dateRangeStart, lte: dateRangeEnd } } }];
    if (monitorId) {
      filter.push({ term: { 'monitor.id': monitorId } });
    }
    if (status) {
      filter.push({ term: { 'monitor.status': status } });
    }

    let postFilterClause = {};
    if (location) {
      postFilterClause = { post_filter: { term: { 'observer.geo.name': location } } };
    }
    const queryContext = { bool: { filter } };
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          ...queryContext,
        },
        ...sortParam,
        ...sizeParam,
        aggregations: {
          locations: {
            terms: {
              field: 'observer.geo.name',
              missing: 'N/A',
              size: 1000,
            },
          },
        },
        ...postFilterClause,
      },
    };

    const {
      hits: { hits, total },
      aggregations: aggs,
    } = await callES('search', params);

    const locations = get(aggs, 'locations', { buckets: [{ key: 'N/A', doc_count: 0 }] });

    const pings: Ping[] = hits.map(({ _id, _source }: any) => {
      const timestamp = _source['@timestamp'];

      // Calculate here the length of the content string in bytes, this is easier than in client JS, where
      // we don't have access to Buffer.byteLength. There are some hacky ways to do this in the
      // client but this is cleaner.
      const httpBody = get<HttpBody>(_source, 'http.response.body');
      if (httpBody && httpBody.content) {
        httpBody.content_bytes = Buffer.byteLength(httpBody.content);
      }

      return { id: _id, timestamp, ..._source };
    });

    const results: PingResults = {
      total: total.value,
      locations: locations.buckets.map((bucket: { key: string }) => bucket.key),
      pings,
    };

    return results;
  },

  getLatestMonitorStatus: async ({ callES, dateStart, dateEnd, monitorId, location }) => {
    // TODO: Write tests for this function

    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: dateStart,
                    lte: dateEnd,
                  },
                },
              },
              ...(monitorId ? [{ term: { 'monitor.id': monitorId } }] : []),
              ...(location ? [{ term: { 'observer.geo.name': location } }] : []),
            ],
          },
        },
        size: 0,
        aggs: {
          by_id: {
            terms: {
              field: 'monitor.id',
              size: 1000,
            },
            aggs: {
              latest: {
                top_hits: {
                  size: 1,
                  sort: {
                    '@timestamp': { order: 'desc' },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = await callES('search', params);
    const ping: any = result.aggregations.by_id.buckets?.[0]?.latest.hits?.[0] ?? {};

    return {
      ...ping?._source,
      timestamp: ping?.['@timestamp'],
    };
  },

  getPingHistogram: async ({
    callES,
    dateRangeStart,
    dateRangeEnd,
    filters,
    monitorId,
    statusFilter,
  }) => {
    const boolFilters = parseFilterQuery(filters);
    const additionaFilters = [];
    if (monitorId) {
      additionaFilters.push({ match: { 'monitor.id': monitorId } });
    }
    if (boolFilters) {
      additionaFilters.push(boolFilters);
    }
    const filter = getFilterClause(dateRangeStart, dateRangeEnd, additionaFilters);
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
  },

  getDocCount: async ({ callES }) => {
    const { count } = await callES('count', { index: INDEX_NAMES.HEARTBEAT });

    return { count };
  },
};
