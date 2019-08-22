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
  CursorPagination,
} from './adapter_types';
import {
  MonitorSummary,
  SummaryHistogram,
  Check,
  StatesIndexStatus,
  CursorDirection,
  SortOrder,
} from '../../../../common/graphql/types';
import { INDEX_NAMES, STATES, QUERY, CONTEXT_DEFAULTS } from '../../../../common/constants';
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
  statusFilter?: string;
};

export class ElasticsearchMonitorStatesAdapter implements UMMonitorStatesAdapter {
  constructor(private readonly database: DatabaseAdapter) {
    this.database = database;
  }

  public async getMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination: CursorPagination = CONTEXT_DEFAULTS.CURSOR_PAGINATION,
    filters?: string | null
  ): Promise<GetMonitorStatesResult> {
    const size = 10;

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
      statusFilter,
    };

    console.log('PAGINATION GET', pagination);

    const enriched = await queryEnriched(queryContext);

    const encodeJSONB64 = (p: any): string | null => {
      if (!p) {
        return null;
      }

      return Buffer.from(JSON.stringify(p)).toString('base64');
    };

    return {
      summaries: enriched.items,
      nextPagePagination: encodeJSONB64(enriched.nextPagePagination),
      prevPagePagination: encodeJSONB64(enriched.prevPagePagination),
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
