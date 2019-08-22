import { CursorDirection, SortOrder } from '../../../../common/graphql/types';
import { QueryContext } from './elasticsearch_monitor_states_adapter';
import { INDEX_NAMES, QUERY } from '../../../../common/constants';
import { get, set } from 'lodash';
import { CursorPagination } from './adapter_types';

export type MonitorLocCheckGroup = {
  monitorId: string;
  location: string | null;
  checkGroup: string;
  timestamp: Date;
  up: number;
  down: number;
};

export type MonitorIdWithGroups = {
  id: string;
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
  let currentMonitor: MonitorIdWithGroups | null = null;

  let paginationBefore: CursorPagination | null = null;

  while (items.length < size) {
    const mlcg = await fetcher.next();
    if (!mlcg) {
      break; // No more items to fetch
    }
    // On our first item set the previous pagination to be items before this if they exist
    if (items.length === 0) {
      const reverseFetcher = fetcher.reverse();
      paginationBefore =
        reverseFetcher && (await reverseFetcher.peek())
          ? reverseFetcher.paginationAfterCurrent()
          : null;
    }

    if (currentMonitor && currentMonitor.id === mlcg.monitorId) {
      currentMonitor.groups.push(mlcg);
    } else {
      currentMonitor = { id: mlcg.monitorId, groups: [mlcg] };
    }

    // Handle the case where we are at the end of the results or
    // have processed all the mlcgs for this monitor
    const peek = await fetcher.peek();
    if (!peek || (peek && peek.monitorId != mlcg.monitorId)) {
      const status = currentMonitor.groups.some(g => g.down > 0) ? 'down' : 'up';
      if (!queryContext.statusFilter || queryContext.statusFilter === status) {
        items.push(currentMonitor);
      }
    }
  }

  // We have to create these objects before checking if we can navigate backward
  const paginationAfter: CursorPagination | null = (await fetcher.peek())
    ? fetcher.paginationAfterCurrent()
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

export class LatestCheckGroupFetcher {
  queryContext: QueryContext;
  // Cache representing pre-fetched query results.
  // The first item is the CheckGroup this represents.
  buffer: MonitorLocCheckGroup[];
  bufferPos: number;
  endOfStream: boolean;
  searchAfter: any;

  constructor(
    queryContext: QueryContext,
    initialBuffer: MonitorLocCheckGroup[] = [],
    initialBufferPos: number = -1
  ) {
    this.queryContext = queryContext;
    this.buffer = initialBuffer;
    this.bufferPos = initialBufferPos;
    this.endOfStream = false;
    this.searchAfter = queryContext.pagination.cursorKey;
  }

  // Get a CursorPaginator object that will resume after the current() value.
  paginationAfterCurrent(): CursorPagination | null {
    const current = this.current();
    const cursorKey = current
      ? { monitor_id: current.monitorId, location: current.location }
      : null;

    return Object.assign({}, this.queryContext.pagination, { cursorKey });
  }

  // Returns a copy of this fetcher that goes backwards, not forwards from the current positon
  reverse(): LatestCheckGroupFetcher | null {
    const reverseContext = Object.assign({}, this.queryContext);
    const current = this.current();

    reverseContext.pagination = {
      cursorKey: current ? { monitor_id: current.monitorId, location: current.location } : null,
      sortOrder: this.queryContext.pagination.sortOrder,
      cursorDirection:
        this.queryContext.pagination.cursorDirection === CursorDirection.AFTER
          ? CursorDirection.BEFORE
          : CursorDirection.AFTER,
    };

    return current ? new LatestCheckGroupFetcher(reverseContext, [current], 0) : null;
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
    if (this.endOfStream) {
      return null;
    }
    const found = this.buffer[this.bufferPos + 1];
    if (found) {
      this.bufferPos++;
      return found;
    }

    await this.queryNextAndBuffer();
    return await this.next();
  }

  async peek(recurse: boolean = true): Promise<MonitorLocCheckGroup | null> {
    if (this.endOfStream) {
      return null;
    }

    const bufAhead = this.buffer[this.bufferPos + 1];
    if (bufAhead) {
      return bufAhead;
    }

    await this.queryNextAndBuffer();

    if (recurse) {
      return await this.peek(false);
    } else {
      return null;
    }
  }

  async queryNextAndBuffer() {
    // Trim the buffer to just the current element since we'll be fetching more
    const current = this.current();
    if (current) {
      this.buffer = [current];
      this.bufferPos = 0;
    }

    const results = await this.queryCheckGroupsPage();
    if (results.checkGroups.length === 0) {
      this.endOfStream = true;
      return;
    }

    results.checkGroups.forEach(cg => this.buffer.push(cg));
    this.searchAfter = results.searchAfter;
  }

  private async queryCheckGroupsPage(size: number = 1000): Promise<CheckGroupsPageResult> {
    const result = await this.execCheckGroupsQuery(this.queryContext.request, size);
    const checkGroups: MonitorLocCheckGroup[] = [];

    get<any>(result, 'aggregations.monitors.buckets', []).forEach((bucket: any) => {
      const hitSource = bucket.summaries.top.hits.hits[0]._source;
      checkGroups.push({
        monitorId: bucket.key.monitor_id,
        location: bucket.key.location,
        checkGroup: hitSource.monitor.check_group,
        timestamp: hitSource['@timestamp'],
        up: hitSource.summary.up,
        down: hitSource.summary.down,
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
                      includes: ['monitor.check_group', '@timestamp', 'summary.up', 'summary.down'],
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
