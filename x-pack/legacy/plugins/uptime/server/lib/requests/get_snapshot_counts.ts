/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { Snapshot } from '../../../common/runtime_types';
import { QueryContext, MonitorGroupIterator } from './search';
import { CONTEXT_DEFAULTS, INDEX_NAMES } from '../../../common/constants';

export interface GetSnapshotCountParams {
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string | null;
  statusFilter?: string;
}

const fastStatusCount = async (context: QueryContext): Promise<Snapshot> => {
  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      size: 0,
      query: { bool: { filter: await context.dateAndCustomFilters() } },
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

export const getSnapshotCount: UMElasticsearchQueryFn<GetSnapshotCountParams, Snapshot> = async ({
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
    Infinity,
    statusFilter
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

  return {
    total: statusFilter ? counts[statusFilter] : counts.total,
    up: statusFilter === 'down' ? 0 : counts.up,
    down: statusFilter === 'up' ? 0 : counts.down,
  };
};
