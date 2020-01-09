/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { CursorPagination } from '../adapter_types';
import { QueryContext } from './query_context';
import { QUERY } from '../../../../../common/constants';
import { CursorDirection, MonitorSummary, SortOrder } from '../../../../../common/graphql/types';
import { enrichMonitorGroups } from './enrich_monitor_groups';
import { MonitorGroupIterator } from './monitor_group_iterator';

/**
 *
 * Gets a single page of results per the settings in the provided queryContext. These results are very minimal,
 * just monitor IDs and check groups. This takes an optional `MonitorGroupEnricher` that post-processes the minimal
 * data, decorating it appropriately. The function also takes a fetcher, which does all the actual fetching.
 * @param queryContext defines the criteria for the data on the current page
 * @param monitorGroupFetcher performs paginated monitor fetching
 * @param monitorEnricher decorates check group results with additional data
 */
// just monitor IDs and check groups. This takes an optional `MonitorGroupEnricher` that post-processes the minimal
// data, decorating it appropriately. The function also takes a fetcher, which does all the actual fetching.
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

// Fetches the most recent monitor groups for the given page,
// in the manner demanded by the `queryContext` and return at most `size` results.
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
// This useful to determine if the results need to be reversed from their ES results order.
// I.E. when navigating backwards using prevPagePagination (CursorDirection.Before) yet using a SortOrder.ASC.
const searchSortAligned = (pagination: CursorPagination): boolean => {
  if (pagination.cursorDirection === CursorDirection.AFTER) {
    return pagination.sortOrder === SortOrder.ASC;
  } else {
    return pagination.sortOrder === SortOrder.DESC;
  }
};

// Minimal interface representing the most recent set of groups accompanying a MonitorId in a given context.
export interface MonitorGroups {
  id: string;
  groups: MonitorLocCheckGroup[];
}

// Representation of the data returned when aggregating summary check groups.
export interface MonitorLocCheckGroup {
  monitorId: string;
  location: string | null;
  checkGroup: string;
  status: 'up' | 'down';
  summaryTimestamp: Date;
}

// Represents a page that has not yet been enriched.
export interface MonitorGroupsPage {
  monitorGroups: MonitorGroups[];
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
}

// Representation of a full page of results with pagination data for constructing next/prev links.
export interface EnrichedPage {
  items: MonitorSummary[];
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
}

// A function that does the work of matching the minimal set of data for this query, returning just matching fields
// that are efficient to access while performing the query.
export type MonitorGroupsFetcher = (
  queryContext: QueryContext,
  size: number
) => Promise<MonitorGroupsPage>;

// A function that takes a set of check groups and returns richer MonitorSummary objects.
export type MonitorEnricher = (
  queryContext: QueryContext,
  checkGroups: string[]
) => Promise<MonitorSummary[]>;
