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
    const context = new QueryContext(
      callES,
      dateRangeStart,
      dateRangeEnd,
      CONTEXT_DEFAULTS.CURSOR_PAGINATION,
      filters && filters !== '' ? JSON.parse(filters) : null,
      CONTEXT_DEFAULTS.MAX_MONITORS_FOR_SNAPSHOT_COUNT,
      // ignore the supplied status filter, we apply it at the end
      undefined
    );

    // Calculate the total, up, and down counts.
    const counts = await fastStatusCount(context);

    // Check if the last count was accurate, if not, we need to perform a slower count with the
    // MonitorGroupsIterator.
    if (!(await context.hasTimespan())) {
      // Figure out whether 'up' or 'down' is more common. It's faster to count the lower cardinality
      // one then use subtraction to figure out its opposite.
      const [leastCommonStatus, mostCommonStatus]: Array<'up' | 'down'> =
        counts.up > counts.down ? ['down', 'up'] : ['up', 'down'];
      counts[leastCommonStatus] = await slowStatusCount(context, leastCommonStatus);
      counts[mostCommonStatus] = counts.total - counts[leastCommonStatus];
    }

    return counts;
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

const fastStatusCount = async (context: QueryContext): Promise<Snapshot> => {
  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      size: 0,
      query: { bool: { filter: await context.dateAndCustomFilters() } },
      aggs: {
        unique: {
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
  };
};

const slowStatusCount = async (context: QueryContext, status: string): Promise<number> => {
  const downContext = context.clone();
  downContext.statusFilter = status;
  const iterator = new MonitorGroupIterator(downContext);
  let count = 0;
  while (await iterator.next()) {
    count++;
  }
  return count;
};
