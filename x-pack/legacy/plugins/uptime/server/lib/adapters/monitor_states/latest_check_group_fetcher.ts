import { CursorDirection, SortOrder, CursorPagination } from '../../../../common/graphql/types';
import { QueryContext } from './elasticsearch_monitor_states_adapter';
import { INDEX_NAMES, STATES, QUERY } from '../../../../common/constants';
import { get, set } from 'lodash';

export type MonitorLocCheckGroup = {
  monitorId: string;
  location: string | null;
  checkGroup: string;
  timestamp: Date;
};

export type MonitorIdWithGroups = {
  monitorId: string;
  groups: MonitorLocCheckGroup[];
};

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

  const fetcher = new LatestCheckGroupFetcher(queryContext);
  let lastItem: MonitorIdWithGroups | null = null;
  while (items.length < size) {
    const mlcg = await fetcher.next();
    if (!mlcg) {
      break; // No more items to fetch
    }

    if (lastItem && lastItem.monitorId === mlcg.monitorId) {
      lastItem.groups.push(mlcg);
      continue;
    }

    lastItem = { monitorId: mlcg.monitorId, groups: [] };
    items.push(lastItem);
  }

  // We have to create these objects before checking if we can navigate backward
  const paginationAfter: CursorPagination | null = fetcher.peek()
    ? fetcher.paginationAfterCurrent()
    : null;
  const paginationBefore: CursorPagination | null = fetcher.reverse().peek()
    ? fetcher.reverse().paginationAfterCurrent()
    : null;

  const ssAligned = searchSortAligned(queryContext.pagination);

  return {
    items,
    nextPagePagination: ssAligned ? paginationAfter : paginationBefore,
    prevPagePagination: ssAligned ? paginationBefore : paginationAfter,
  };
};

export class LatestCheckGroupFetcher {
  queryContext: QueryContext;
  // Cache representing pre-fetched query results.
  // The first item is the CheckGroup this represents.
  buffer: MonitorLocCheckGroup[];
  bufferPos: number;
  endOfStream: boolean;
  searchAfter: any;

  constructor(queryContext: QueryContext) {
    this.queryContext = queryContext;
    this.buffer = [];
    this.bufferPos = 0;
    this.endOfStream = false;
    this.searchAfter = queryContext.pagination.cursorKey;
  }

  // Get a CursorPaginator object that will resume after the current() value.
  paginationAfterCurrent(): CursorPagination | null {
    const current = this.current();
    const cursorKey = current
      ? { monitor_id: current.monitorId, location: current.location }
      : null;
    console.log('COMBINE', this.queryContext.pagination, cursorKey);
    return Object.assign({}, this.queryContext.pagination, { cursorKey });
  }

  // Returns a copy of this fetcher that goes backwards, not forwards from the cursorKey the fetcher
  // was initialized with (not the current point).
  reverse(): LatestCheckGroupFetcher {
    const reverseContext = Object.assign({}, this.queryContext);
    reverseContext.pagination = {
      cursorKey: this.queryContext.pagination.cursorKey,
      sortOrder: this.queryContext.pagination.sortOrder,
      cursorDirection:
        this.queryContext.pagination.cursorDirection === CursorDirection.AFTER
          ? CursorDirection.BEFORE
          : CursorDirection.AFTER,
    };
    console.log('REG PAGINATION', this.queryContext.pagination);
    console.log('REVERSE PAGINATION', reverseContext.pagination);
    return new LatestCheckGroupFetcher(reverseContext);
  }

  // Returns the last item fetched with next(). null if no items fetched with
  // next or if next has not yet been invoked.
  current(): MonitorLocCheckGroup | null {
    if (this.endOfStream) {
      return null;
    }

    return this.buffer[this.bufferPos] || null;
  }

  async next(): Promise<MonitorLocCheckGroup | null> {
    console.log('BUFFER STAT CG', this.buffer.length, this.bufferPos);
    if (this.endOfStream) {
      return null;
    }
    const found = this.buffer[this.bufferPos];
    if (found) {
      this.bufferPos++;
      return found;
    }

    await this.queryAndBuffer();
    return await this.next();
  }

  async peek(): Promise<MonitorLocCheckGroup | null> {
    const bufAhead = this.buffer[this.bufferPos + 1];
    if (bufAhead) {
      return bufAhead;
    }

    const results = await this.queryCheckGroupsPage(1);
    return results.checkGroups[0];
  }

  async queryAndBuffer() {
    const results = await this.queryCheckGroupsPage();
    this.bufferPos = 0;
    this.buffer = results.checkGroups;
    this.searchAfter = results.searchAfter;
    if (this.buffer.length === 0) {
      this.endOfStream = true;
    }
  }

  private async queryCheckGroupsPage(size: number = 50): Promise<CheckGroupsPageResult> {
    const result = await this.execCheckGroupsQuery(this.queryContext.request, size);
    const checkGroups: MonitorLocCheckGroup[] = [];

    get<any>(result, 'aggregations.monitors.buckets', []).forEach((bucket: any) => {
      checkGroups.push({
        monitorId: get<string>(bucket, 'key.monitor_id'),
        location: get<string>(bucket, 'key.location'),
        checkGroup: get<string>(bucket, 'summaries.top.hits.hits[0]._source.monitor.check_group'),
        timestamp: get<Date>(bucket, 'summaries.top.hits.hits[0]._source.@timestamp'),
      });
    });

    return {
      checkGroups,
      searchAfter: result.aggregations.monitors.after_key,
    };
  }

  private async execCheckGroupsQuery(request: any, size: number) {
    const body = this.queryBody(size, this.searchAfter);

    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body,
    };

    return await this.queryContext.database.search(request, params);
  }

  private queryBody(size: number, searchAfter: any) {
    const compositeOrder = cursorDirectionToOrder(this.queryContext.pagination.cursorDirection);

    // We check for summary.up to ensure that the check group
    // is complete. Summary fields are only present on
    // completed check groups.
    const filters = [this.queryContext.filterClause] || [];

    const body = {
      query: {
        bool: {
          filter: filters,
        },
      },
      size: 0,
      aggs: {
        monitors: {
          composite: {
            /**
             * The goal here is to fetch more than enough check groups to reach the target
             * amount in one query.
             *
             * For larger cardinalities, we can only count on being able to fetch max bucket
             * size, so we will have to run this query multiple times.
             *
             * Multiplying `size` by 2 assumes that there will be less than three locations
             * for the deployment, if needed the query will be run subsequently.
             */
            size: Math.min(size * 2, QUERY.DEFAULT_AGGS_CAP),
            sources: [
              {
                monitor_id: {
                  terms: {
                    field: 'monitor.id',
                    order: compositeOrder,
                  },
                },
              },
              {
                location: {
                  terms: {
                    field: 'observer.geo.name',
                    missing_bucket: true,
                    order: compositeOrder,
                  },
                },
              },
            ],
          },
          aggs: {
            summaries: {
              filter: {
                exists: { field: 'summary.up' },
              },
              aggs: {
                top: {
                  top_hits: {
                    sort: [
                      {
                        '@timestamp': 'desc',
                      },
                    ],
                    _source: {
                      includes: ['monitor.check_group', '@timestamp'],
                    },
                    size: 1,
                  },
                },
              },
            },
          },
        },
      },
    };

    if (searchAfter) {
      if (typeof searchAfter === 'string') {
        // This is usually passed through from the browser as string encoded JSON
        searchAfter = JSON.parse(searchAfter);
      }
      set(body, 'aggs.monitors.composite.after', searchAfter);
    }
    return body;
  }
}

type CheckGroupsPageResult = {
  checkGroups: MonitorLocCheckGroup[];
  searchAfter: string;
};

const cursorDirectionToOrder = (cd: CursorDirection): 'asc' | 'desc' => {
  return CursorDirection[cd] === CursorDirection.AFTER ? 'asc' : 'desc';
};

const searchSortAligned = (pagination: CursorPagination): boolean => {
  if (pagination.cursorDirection === CursorDirection.AFTER) {
    return pagination.sortOrder === SortOrder.ASC;
  } else {
    return pagination.sortOrder === SortOrder.DESC;
  }
};

const reorderResults = <T>(results: T[], pagination: CursorPagination): T[] => {
  if (searchSortAligned(pagination)) {
    return results;
  }

  results.reverse();
  return results;
};
