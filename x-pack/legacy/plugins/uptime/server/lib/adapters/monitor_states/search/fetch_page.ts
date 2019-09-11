/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { CursorPagination } from '../adapter_types';
import { QueryContext } from '../elasticsearch_monitor_states_adapter';
import { QUERY } from '../../../../../common/constants';
import { CursorDirection, MonitorSummary, SortOrder } from '../../../../../common/graphql/types';
import { enrichMonitorGroups } from './enrich_monitor_groups';
import { MonitorGroupIterator } from './monitor_group_iterator';

export interface MonitorGroupsPage {
  monitorGroups: MonitorGroups[];
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
  checkGroup: string;
  status: 'up' | 'down';
}

export interface EnrichedPage {
  items: MonitorSummary[];
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
}

export type MonitorGroupsFetcher = (
  queryContext: QueryContext,
  size: number
) => Promise<MonitorGroupsPage>;

export type MonitorEnricher = (
  queryContext: QueryContext,
  checkGroups: string[]
) => Promise<MonitorSummary[]>;

export const fetchPage = async (
  queryContext: QueryContext,
  monitorGroupFetcher: MonitorGroupsFetcher = fetchPageMonitorGroups,
  monitorEnricher: MonitorEnricher = enrichMonitorGroups
): Promise<EnrichedPage> => {
  const size = Math.min(queryContext.size, QUERY.DEFAULT_AGGS_CAP);
  const monitorPage = await monitorGroupFetcher(queryContext, size);

  const checkGroups: string[] = flatten(
    monitorPage.monitorGroups.map(monitorGroups => monitorGroups.groups.map(g => g.checkGroup))
  );

  const enrichedMonitors = await monitorEnricher(queryContext, checkGroups);

  return {
    items: enrichedMonitors,
    nextPagePagination: monitorPage.nextPagePagination,
    prevPagePagination: monitorPage.prevPagePagination,
  };
};

const fetchPageMonitorGroups: MonitorGroupsFetcher = async (
  queryContext: QueryContext,
  size: number
): Promise<MonitorGroupsPage> => {
  const monitorGroups: MonitorGroups[] = [];
  const iterator = new MonitorGroupIterator(queryContext);

  let paginationBefore: CursorPagination | null = null;
  while (monitorGroups.length < size) {
    const monitor = await iterator.next();
    if (!monitor) {
      break; // No more items to fetch
    }
    monitorGroups.push(monitor);

    // We want the before pagination to be before the first item we encounter
    if (monitorGroups.length === 1) {
      paginationBefore = await iterator.paginationBeforeCurrent();
    }
  }

  // We have to create these objects before checking if we can navigate backward
  console.log("ATTEMPT TO GET NEXT PAGINATION", await iterator.peek(), await iterator.paginationAfterCurrent())
  const paginationAfter = await iterator.paginationAfterCurrent();

  const ssAligned = searchSortAligned(queryContext.pagination);

  if (!ssAligned) {
    monitorGroups.reverse();
  }

  return {
    monitorGroups,
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
