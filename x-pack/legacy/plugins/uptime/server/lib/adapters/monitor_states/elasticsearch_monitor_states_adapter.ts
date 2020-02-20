/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMonitorStatesAdapter } from './adapter_types';
import { INDEX_NAMES, CONTEXT_DEFAULTS } from '../../../../common/constants';
import { fetchPage } from './search';
import { MonitorGroupIterator } from './search/monitor_group_iterator';
import { Snapshot } from '../../../../common/runtime_types';
import { QueryContext } from './search/query_context';

export const elasticsearchMonitorStatesAdapter: UMMonitorStatesAdapter = {
  // Gets a page of monitor states.
  getMonitorStates: async ({
    callES,
    dateRangeStart,
    dateRangeEnd,
    pagination,
    filters,
    statusFilter,
  }) => {
    pagination = pagination || CONTEXT_DEFAULTS.CURSOR_PAGINATION;
    statusFilter = statusFilter === null ? undefined : statusFilter;
    const size = 10;

    const queryContext = new QueryContext(
      callES,
      dateRangeStart,
      dateRangeEnd,
      pagination,
      filters && filters !== '' ? JSON.parse(filters) : null,
      size,
      statusFilter
    );

    const page = await fetchPage(queryContext);

    return {
      summaries: page.items,
      nextPagePagination: jsonifyPagination(page.nextPagePagination),
      prevPagePagination: jsonifyPagination(page.prevPagePagination),
    };
  },

  getSnapshotCount: async ({
    callES,
    dateRangeStart,
    dateRangeEnd,
    filters,
    statusFilter,
  }): Promise<Snapshot> => {
    if (!(statusFilter === 'up' || statusFilter === 'down' || statusFilter === undefined)) {
      throw new Error(`Invalid status filter value '${statusFilter}'`);
    }

    const context = new QueryContext(
      callES,
      dateRangeStart,
      dateRangeEnd,
      CONTEXT_DEFAULTS.CURSOR_PAGINATION,
      filters && filters !== '' ? JSON.parse(filters) : null,
      CONTEXT_DEFAULTS.MAX_MONITORS_FOR_SNAPSHOT_COUNT,
      statusFilter
    );

    // Calculate the total, up, and down counts.
    let counts = await countDirect(context);

    const tooManyForExact = Math.min(counts.down, counts.up) > 1000;

    const method = (await context.hasTimespan()) && tooManyForExact ? 'timeslice' : 'iterator';

    if (method === 'iterator') {
      // Figure out whether 'up' or 'down' is more common. It's faster to count the lower cardinality
      // one then use subtraction to figure out its opposite.
      const [leastCommonStatus, mostCommonStatus]: Array<'up' | 'down'> =
        counts.up > counts.down ? ['down', 'up'] : ['up', 'down'];
      counts[leastCommonStatus] = await iteratorCountForStatus(context, leastCommonStatus);
      counts[mostCommonStatus] = counts.total - counts[leastCommonStatus];
    } else {
      // If we are here we have the monitor.timespan field available.
      // To approximate our status counts we'll want to look at a smaller slice in time.
      // 30s should give us enough time to handle most delays in ingest. While we do use 5m as a value in other cases
      // that's too long to be useful for this type of snapshot.
      // TODO: In a future version of this code when we support 'stale' monitors let's count some monitors
      // as stale instead
      const timespanSlice = new Date().getTime() - 30000;
      const extraFilters = [
        {
          range: { 'monitor.timespan': { gte: timespanSlice, relation: 'intersects' } },
        },
      ];

      counts = await countDirect(context, extraFilters);
    }

    return {
      total: statusFilter ? counts[statusFilter] : counts.total,
      up: statusFilter === 'down' ? 0 : counts.up,
      down: statusFilter === 'up' ? 0 : counts.down,
      method,
    };
  },

  statesIndexExists: async ({ callES }) => {
    // TODO: adapt this to the states index in future release
    const {
      _shards: { total },
      count,
    } = await callES('count', { index: INDEX_NAMES.HEARTBEAT });
    return {
      indexExists: total > 0,
      docCount: {
        count,
      },
    };
  },
};

// To simplify the handling of the group of pagination vars they're passed back to the client as a string
const jsonifyPagination = (p: any): string | null => {
  if (!p) {
    return null;
  }

  return JSON.stringify(p);
};

const countDirect = async (context: QueryContext, extraFilters: any[] = []): Promise<Snapshot> => {
  const filter = await context.dateAndCustomFilters();
  extraFilters.forEach(f => filter.push(f));

  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      size: 0,
      query: {
        bool: { filter },
      },
      aggs: {
        unique: {
          // We set the precision threshold to 40k which is the max precision supported by cardinality
          cardinality: { field: 'monitor.id', precision_threshold: 40000 },
        },
        down: {
          filter: { range: { 'summary.down': { gt: 0 } } },
          aggs: {
            unique: { cardinality: { field: 'monitor.id', precision_threshold: 40000 } },
          },
        },
      },
    },
  };

  const statistics = await context.search(params);
  const total = statistics.aggregations.unique.value;
  const down = statistics.aggregations.down.unique.value;

  return {
    total,
    down,
    up: total - down,
    method: 'approximate',
  };
};

const iteratorCountForStatus = async (context: QueryContext, status: string): Promise<number> => {
  const downContext = context.clone();
  downContext.statusFilter = status;
  const iterator = new MonitorGroupIterator(downContext);
  let count = 0;
  while (await iterator.next()) {
    count++;
  }
  return count;
};
