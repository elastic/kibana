import { MonitorIterator } from './monitor_iterator';
import { MonitorIdWithGroups } from './monitor_id_with_groups';
import { CursorPagination } from './adapter_types';
import { QueryContext } from './elasticsearch_monitor_states_adapter';
import { CursorDirection, SortOrder } from '../../../../common/graphql/types';

export type FetchMonitorLocCheckGroupsResult = {
  items: MonitorIdWithGroups[];
  nextPagePagination: CursorPagination | null;
  prevPagePagination: CursorPagination | null;
};

export const fetchMonitorLocCheckGroups = async (
  queryContext: QueryContext,
  size: number
): Promise<FetchMonitorLocCheckGroupsResult> => {
  const items: MonitorIdWithGroups[] = [];
  const fetcher = new MonitorIterator(queryContext);

  let paginationBefore: CursorPagination | null = null;
  const start = new Date();
  while (items.length < size) {
    const monitor = await fetcher.next();
    if (!monitor) {
      break; // No more items to fetch
    }
    // On our first item set the previous pagination to be items before this if they exist
    if (items.length === 0) {
      const reverseFetcher = await fetcher.reverse();
      paginationBefore = reverseFetcher && (await reverseFetcher.paginationAfterCurrent());
    }

    items.push(monitor);
  }
  console.log('Fetching done', new Date().getTime() - start.getTime() + 'ms', items.length, size);

  // We have to create these objects before checking if we can navigate backward
  const paginationAfter: CursorPagination | null = (await fetcher.peek())
    ? await fetcher.paginationAfterCurrent()
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

const searchSortAligned = (pagination: CursorPagination): boolean => {
  if (pagination.cursorDirection === CursorDirection.AFTER) {
    return pagination.sortOrder === SortOrder.ASC;
  } else {
    return pagination.sortOrder === SortOrder.DESC;
  }
};
