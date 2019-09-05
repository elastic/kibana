/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorIterator } from './monitor_iterator';
import { MonitorIdWithGroups } from './monitor_id_with_groups';
import { CursorPagination } from './adapter_types';
import { QueryContext } from './elasticsearch_monitor_states_adapter';
import { CursorDirection, SortOrder } from '../../../../common/graphql/types';

export interface MonitorPage {
  items: MonitorIdWithGroups[];
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
}

export const fetchPaginatedMonitors = async (
  queryContext: QueryContext,
  size: number
): Promise<MonitorPage> => {
  const items: MonitorIdWithGroups[] = [];
  const iterator = new MonitorIterator(queryContext);

  let paginationBefore: CursorPagination | null = null;
  while (items.length < size) {
    const monitor = await iterator.next();
    if (!monitor) {
      break; // No more items to fetch
    }
    items.push(monitor);

    // We want the before pagination to be before the first item we encounter
    if (items.length === 1) {
      paginationBefore = await iterator.paginationBeforeCurrent();
    }
  }

  // We have to create these objects before checking if we can navigate backward
  const paginationAfter: CursorPagination | null = (await iterator.peek())
    ? await iterator.paginationAfterCurrent()
    : null;

  const ssAligned = searchSortAligned(queryContext.pagination);

  if (!ssAligned) {
    items.reverse();
  }

  return {
    items,
    nextPagePagination: ssAligned ? paginationAfter : paginationBefore,
    prevPagePagination: ssAligned ? paginationBefore : paginationAfter,
  };
};

// Returns true if the order returned by the ES query matches the requested sort order.
const searchSortAligned = (pagination: CursorPagination): boolean => {
  if (pagination.cursorDirection === CursorDirection.AFTER) {
    return pagination.sortOrder === SortOrder.ASC;
  } else {
    return pagination.sortOrder === SortOrder.DESC;
  }
};
