/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { APICaller } from 'kibana/server';
import { CursorPagination } from '../adapter_types';
import { INDEX_NAMES } from '../../../../../common/constants';
import { parseRelativeDate } from '../../../helper/get_histogram_interval';

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

  async dateRangeFilter(): Promise<any> {
    const timestampClause = {
      range: { '@timestamp': { gte: this.dateRangeStart, lte: this.dateRangeEnd } },
    };

    if (!(await this.hasTimespan())) {
      return timestampClause;
    }

    return {
      bool: {
        filter: [
          timestampClause,
          {
            bool: {
              should: [
                this.timespanClause(),
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

  // timeRangeClause queries the given date range using the monitor timespan field
  // which is a bit dicey since we may have data that predates this field existing,
  // or we may have data that has it, but a slow ingestion process.
  timespanClause() {
    // We subtract 5m from the start to account for data that shows up late,
    // for instance, with a large value for the elasticsearch refresh interval
    // setting it lower can work very well on someone's laptop, but with real world
    // latencies and slowdowns that's dangerous. Making this value larger makes things
    // only slower, but only marginally so, and prevents people from seeing weird
    // behavior.

    const tsEnd = parseRelativeDate(this.dateRangeEnd, { roundUp: true })!;
    const tsStart = moment(tsEnd).subtract(5, 'minutes');

    return {
      range: {
        'monitor.timespan': {
          gte: tsStart.toISOString(),
          lte: tsEnd.toISOString(),
        },
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
                filter: [this.timespanClause()],
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
