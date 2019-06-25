/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { DatabaseAdapter } from '../database';
import { UMMonitorStatesAdapter } from './adapter_types';
import { MonitorSummary, DocCount, SummaryHistogram } from '../../../../common/graphql/types';
import { INDEX_NAMES } from '../../../../common/constants';
import { getHistogramInterval } from '../../helper';

export class ElasticsearchMonitorStatesAdapter implements UMMonitorStatesAdapter {
  constructor(private readonly database: DatabaseAdapter) {
    this.database = database;
  }

  public async getMonitorStates(
    request: any,
    pageIndex: number,
    pageSize: number,
    sortField?: string | null,
    sortDirection?: string | null
  ): Promise<MonitorSummary[]> {
    const params = {
      index: 'heartbeat-states-8.0.0',
      body: {
        from: pageIndex * pageSize,
        size: pageSize,
      },
    };

    if (sortField) {
      set(params, 'body.sort', [
        {
          [sortField]: {
            order: sortDirection || 'asc',
          },
        },
      ]);
    }

    const result = await this.database.search(request, params);
    const hits = get(result, 'hits.hits', []);
    const monitorIds: string[] = [];
    const monitorStates = hits.map(({ _source }: any) => {
      const { monitor_id } = _source;
      monitorIds.push(monitor_id);
      const sourceState = get<any>(_source, 'state');
      const state = {
        ...sourceState,
        timestamp: sourceState['@timestamp'],
      };
      if (state.checks) {
        state.checks.sort((a: any, b: any) =>
          a.observer.geo.name === b.observer.geo.name
            ? 0
            : a.observer.geo.name >= b.observer.geo.name
            ? 1
            : -1
        );
        state.checks = state.checks.map((check: any) => ({
          ...check,
          timestamp: check['@timestamp'],
        }));
      } else {
        state.checks = [];
      }
      const f = {
        monitor_id,
        state,
      };
      return f;
    });

    const histogramMap = await this.getHistogramForMonitors(request, 'now-15m', 'now', monitorIds);
    return monitorStates.map(monitorState => ({
      ...monitorState,
      histogram: histogramMap[monitorState.monitor_id],
    }));
  }

  private async getHistogramForMonitors(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorIds: string[]
  ): Promise<{ [key: string]: SummaryHistogram }> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'monitor.id': monitorIds,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: dateRangeStart,
                    lte: dateRangeEnd,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          by_id: {
            terms: {
              field: 'monitor.id',
              size: 200,
            },
            aggs: {
              histogram: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: getHistogramInterval(dateRangeStart, dateRangeEnd),
                  missing: 0,
                },
                aggs: {
                  status: {
                    terms: {
                      field: 'monitor.status',
                      size: 2,
                      shard_size: 2,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const result = await this.database.search(request, params);

    const buckets: any[] = get(result, 'aggregations.by_id.buckets', []);
    return buckets.reduce((map: { [key: string]: any }, item: any) => {
      const points = get(item, 'histogram.buckets', []).map((histogram: any) => {
        const status = get(histogram, 'status.buckets', []).reduce(
          (statuses: { up: number; down: number }, bucket: any) => {
            if (bucket.key === 'up') {
              statuses.up = bucket.doc_count;
            } else if (bucket.key === 'down') {
              statuses.down = bucket.doc_count;
            }
            return statuses;
          },
          { up: 0, down: 0 }
        );
        return {
          timestamp: histogram.key,
          ...status,
        };
      });

      map[item.key] = {
        count: item.doc_count,
        points,
      };
      return map;
    }, {});
  }

  public async getSummaryCount(request: any): Promise<DocCount> {
    const { count } = await this.database.count(request, { index: 'heartbeat-states-8.0.0' });

    return { count };
  }

  public async statesIndexExists(request: any): Promise<boolean> {
    return await this.database.head(request, { index: 'heartbeat-states-8.0.0' });
  }
}
