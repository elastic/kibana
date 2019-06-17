/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { DatabaseAdapter } from '../database';
import { UMMonitorStatesAdapter } from './adapter_types';
import { MonitorSummary, DocCount } from '../../../../common/graphql/types';

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
    return hits.map(({ _source }: any) => {
      const { monitor_id } = _source;
      const sourceState = get<any>(_source, 'state');
      const state = {
        ...sourceState,
        timestamp: sourceState['@timestamp'],
      };
      if (state.checks) {
        state.checks = state.checks.map((check: any) => ({
          ...check,
          timestamp: check['@timestamp'],
        }));
      }
      const f = {
        monitor_id,
        state,
      };
      return f;
    });
  }

  public async getSummaryCount(request: any): Promise<DocCount> {
    const { count } = await this.database.count(request, { index: 'heartbeat-states-8.0.0' });

    return { count };
  }
}
