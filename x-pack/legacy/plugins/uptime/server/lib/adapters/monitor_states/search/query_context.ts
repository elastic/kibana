/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { APICaller } from 'kibana/server';
import { CursorPagination } from '../adapter_types';
import { INDEX_NAMES } from '../../../../../common/constants';

export class QueryContext {
  callES: APICaller;
  dateRangeStart: string;
  dateRangeEnd: string;
  pagination: CursorPagination;
  filterClause: any | null;
  size: number;
  statusFilter?: string;
  hasTimespanCache?: boolean;

  constructor(
    database: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination: CursorPagination,
    filterClause: any | null,
    size: number,
    statusFilter?: string
  ) {
    this.callES = database;
    this.dateRangeStart = dateRangeStart;
    this.dateRangeEnd = dateRangeEnd;
    this.pagination = pagination;
    this.filterClause = filterClause;
    this.size = size;
    this.statusFilter = statusFilter;
  }

  async search(params: any): Promise<any> {
    params.index = INDEX_NAMES.HEARTBEAT;
    return this.callES('search', params);
  }

  async count(params: any): Promise<any> {
    params.index = INDEX_NAMES.HEARTBEAT;
    return this.callES('count', params);
  }

  async dateAndCustomFilters(): Promise<any[]> {
    const clauses = [await this.dateRangeFilter()];
    if (this.filterClause) {
      clauses.push(this.filterClause);
    }
    return clauses;
  }

  async dateRangeFilter(forceNoTimespan?: boolean): Promise<any> {
    const timestampClause = {
      range: { '@timestamp': { gte: this.dateRangeStart, lte: this.dateRangeEnd } },
    };

    if (forceNoTimespan === true || !(await this.hasTimespan())) {
      return timestampClause;
    }

    // @ts-ignore
    const tsStart = DateMath.parse(this.dateRangeEnd).subtract(10, 'seconds');
    const tsEnd = DateMath.parse(this.dateRangeEnd)!;

    return {
      bool: {
        filter: [
          timestampClause,
          {
            bool: {
              should: [
                {
                  range: {
                    'monitor.timespan': {
                      gte: tsStart.toISOString(),
                      lte: tsEnd.toISOString(),
                    },
                  },
                },
                {
                  bool: {
                    must_not: { exists: { field: 'monitor.timespan' } },
                  },
                },
              ],
            },
          },
        ],
      },
    };
  }

  async hasTimespan(): Promise<boolean> {
    if (this.hasTimespanCache) {
      return this.hasTimespanCache;
    }

    this.hasTimespanCache =
      (
        await this.count({
          body: {
            query: {
              bool: {
                filter: [
                  await this.dateRangeFilter(true),
                  { exists: { field: 'monitor.timespan' } },
                ],
              },
            },
          },
          terminate_after: 1,
        })
      ).count > 0;

    return this.hasTimespanCache;
  }

  clone(): QueryContext {
    return new QueryContext(
      this.callES,
      this.dateRangeStart,
      this.dateRangeEnd,
      this.pagination,
      this.filterClause,
      this.size,
      this.statusFilter
    );
  }
}
