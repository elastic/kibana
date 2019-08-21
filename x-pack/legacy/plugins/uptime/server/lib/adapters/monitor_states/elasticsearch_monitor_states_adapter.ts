/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, flatten, set, sortBy } from 'lodash';
import { DatabaseAdapter } from '../database';
import {
  UMMonitorStatesAdapter,
  MonitorStatesCheckGroupsResult,
  LegacyMonitorStatesQueryResult,
  GetMonitorStatesResult,
  EnrichMonitorStatesResult,
} from './adapter_types';
import {
  MonitorSummary,
  SummaryHistogram,
  Check,
  StatesIndexStatus,
  CursorDirection,
  SortOrder,
  CursorPagination,
} from '../../../../common/graphql/types';
import { INDEX_NAMES, STATES, QUERY } from '../../../../common/constants';
import { getHistogramInterval, getFilteredQueryAndStatusFilter } from '../../helper';
import { fetchMonitorLocCheckGroups } from './latest_check_group_fetcher';
import { queryEnriched } from './query_enriched';

export type QueryContext = {
  database: any;
  request: any;
  dateRangeStart: string;
  dateRangeEnd: string;
  pagination: CursorPagination;
  filterClause: any | null;
  size: number;
};

const checksSortBy = (check: Check) => [
  get<string>(check, 'observer.geo.name'),
  get<string>(check, 'monitor.ip'),
];

const DefaultCursorPagination: CursorPagination = {
  cursorDirection: CursorDirection.AFTER,
  sortOrder: SortOrder.DESC,
};

const cursorDirectionToOrder = (cd: CursorDirection): 'asc' | 'desc' => {
  return CursorDirection[cd] === CursorDirection.AFTER ? 'asc' : 'desc';
};

export class ElasticsearchMonitorStatesAdapter implements UMMonitorStatesAdapter {
  constructor(private readonly database: DatabaseAdapter) {
    this.database = database;
  }

  public async getMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination: CursorPagination = DefaultCursorPagination,
    filters?: string | null
  ): Promise<GetMonitorStatesResult> {
    // TODO: make this configurable
    const size = 10;
    console.log('FUN GET');

    const { query: filterClause, statusFilter } = getFilteredQueryAndStatusFilter(
      dateRangeStart,
      dateRangeEnd,
      filters
    );
    const queryContext: QueryContext = {
      database: this.database,
      request: request,
      dateRangeStart: dateRangeStart,
      dateRangeEnd: dateRangeEnd,
      pagination: pagination,
      filterClause,
      size,
    };

    const checkGroups = await queryEnriched(queryContext);

    console.log('AWAIT IT', JSON.stringify(checkGroups, null, 2));

    return {
      summaries: [],
      isFinalPage: true,
    };
  }

  public async statesIndexExists(request: any): Promise<StatesIndexStatus> {
    // TODO: adapt this to the states index in future release
    const {
      _shards: { total },
      count,
    } = await this.database.count(request, { index: INDEX_NAMES.HEARTBEAT });
    return {
      indexExists: total > 0,
      docCount: {
        count,
      },
    };
  }
}
