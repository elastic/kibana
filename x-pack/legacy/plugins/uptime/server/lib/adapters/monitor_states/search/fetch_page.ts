/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { Iterator } from './iterator';
import { CursorPagination } from '../adapter_types';
import { QueryContext } from '../elasticsearch_monitor_states_adapter';
import { QUERY } from '../../../../../common/constants';
import { enrich } from './enrich';
import { CursorDirection, SortOrder } from '../../../../../common/graphql/types';

export interface MonitorPage {
  items: MonitorGroups[];
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
}

export interface MonitorGroups {
  id: string;
  groups: MonitorLocCheckGroup[];
}
export interface MonitorLocCheckGroup {
  monitorId: string;
  location: string | null;
  filterMatchesLatest: boolean;
  checkGroup: string;
  timestamp: Date;
  up: number;
  down: number;
  status: 'up' | 'down';
}

export interface EnrichedPage {
  items: any[]; // TODO define this type better.
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
}

export const fetchPage = async (queryContext: QueryContext): Promise<EnrichedPage> => {
  const size = Math.min(queryContext.size, QUERY.DEFAULT_AGGS_CAP);
  const monitorPage = await fetchPageMonitors(queryContext, size);

  const checkGroups: string[] = flatten(
    monitorPage.items.map(monitorGroups => monitorGroups.groups.map(g => g.checkGroup))
  );

  const enrichedMonitors = await enrich(queryContext, checkGroups);

  return {
    items: enrichedMonitors,
    nextPagePagination: monitorPage.nextPagePagination,
    prevPagePagination: monitorPage.prevPagePagination,
  };
};

const fetchPageMonitors = async (
  queryContext: QueryContext,
  size: number
): Promise<MonitorPage> => {
  const items: MonitorGroups[] = [];
  const iterator = new Iterator(queryContext);

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
