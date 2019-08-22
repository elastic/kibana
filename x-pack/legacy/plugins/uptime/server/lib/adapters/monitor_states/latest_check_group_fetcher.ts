import { CursorDirection, SortOrder } from '../../../../common/graphql/types';
import { QueryContext } from './elasticsearch_monitor_states_adapter';
import { INDEX_NAMES } from '../../../../common/constants';
import { get, set, sortBy } from 'lodash';
import { CursorPagination } from './adapter_types';

export type MonitorLocCheckGroup = {
  monitorId: string;
  location: string | null;
  filterMatchesLatest: boolean;
  checkGroup: string;
  timestamp: Date;
  up: number;
  down: number;
};

export type MonitorIdWithGroups = {
  id: string;
  matchesFilter: boolean;
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
  const fetcher = new UnfilteredFetcher(queryContext);

  let paginationBefore: CursorPagination | null = null;
  console.log('Start fetching');
  const start = new Date();
  while (items.length < size) {
    const monitor = await fetcher.next();
    if (!monitor) {
      break; // No more items to fetch
    }
    // On our first item set the previous pagination to be items before this if they exist
    if (items.length === 0) {
      console.log('DO REVERSE');
      const reverseFetcher = await fetcher.reverse();
      const revPagination =
        reverseFetcher && (await reverseFetcher.peek()) && reverseFetcher.paginationAfterCurrent()!;
      paginationBefore = revPagination && revPagination.cursorKey ? revPagination : null;
    }

    items.push(monitor);
  }
  console.log('Fetching done', new Date().getTime() - start.getTime(), items.length, size);

  console.log('CHECK NEXT');
  // We have to create these objects before checking if we can navigate backward
  const paginationAfter: CursorPagination | null = (await fetcher.peek())
    ? fetcher.paginationAfterCurrent()
    : null;
  console.log('E CHECK NEXT', paginationAfter);

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

/* export class FilteredFetcher {
  queryContext: QueryContext;
  currentMonitor: MonitorIdWithGroups | null;
  unfilteredFetcher: UnfilteredFetcher;

  constructor(
    queryContext: QueryContext,
    initCurrentMonitor: MonitorIdWithGroups | null = null,
    initUnfilteredFetcher: UnfilteredFetcher | null = null
  ) {
    this.queryContext = queryContext;
    this.currentMonitor = initCurrentMonitor;
    this.unfilteredFetcher = initUnfilteredFetcher || new UnfilteredFetcher(queryContext);
  }

  current(): MonitorIdWithGroups | null {
    return this.currentMonitor;
  }

  async reverse(): Promise<FilteredFetcher | null> {
    if (!this.currentMonitor) {
      return null;
    }
    const revUnfiltered = this.unfilteredFetcher.reverse();
    if (!revUnfiltered) {
      return null;
    }
    const newFetcher = new FilteredFetcher(
      revUnfiltered.queryContext,
      this.currentMonitor,
      revUnfiltered
    );
    const peeked = await newFetcher.peek();
    // The secondary attributes may not have been reversed, we may re-traverse the current item partially
    console.log('BIRDI', peeked);
    console.log('CUR', this.currentMonitor);
    while (peeked && peeked.id === this.currentMonitor.id) {
      console.log('SKIP AHEAD');
      this.next();
    }
    return newFetcher;
  }

  paginationAfterCurrent(): CursorPagination | null {
    return this.unfilteredFetcher.paginationAfterCurrent();
  }

  clone(): FilteredFetcher {
    return new FilteredFetcher(this.queryContext, this.current(), this.unfilteredFetcher.clone());
  }

  // Note this is doesn't cache the peek'd data
  // In the future this may be relevant perf wise, but not today.
  async peek(): Promise<MonitorIdWithGroups | null> {
    const clone = this.clone();
    return await clone.next();
  }

  async next(): Promise<MonitorIdWithGroups | null> {
    // Keep going forward until we find a monitor that matches the filter
    while (true) {
      const mlcg = await this.unfilteredFetcher.next();
      if (!mlcg) {
        this.currentMonitor = mlcg;
        break; // No more items to fetch
      }

      const peek = await this.unfilteredFetcher.peek();
      if (peek && peek.id != monitor.id) {
        if (this.filter(monitor)) {
          break;
        }
      }
    }

    this.currentMonitor = monitor;
    return monitor;
  }

  filter(monitor: MonitorIdWithGroups): boolean {
    const status = monitor.groups.some(g => g.down > 0) ? 'down' : 'up';
    return (
      (!this.queryContext.statusFilter || this.queryContext.statusFilter === status) &&
      monitor.groups.some(g => g.filterMatchesLatest)
    );
  }
}

 */
class UnfilteredFetcher {
  queryContext: QueryContext;
  // Cache representing pre-fetched query results.
  // The first item is the CheckGroup this represents.
  buffer: MonitorIdWithGroups[];
  bufferPos: number;
  endOfStream: boolean;
  searchAfter: any;

  constructor(
    queryContext: QueryContext,
    initialBuffer: MonitorIdWithGroups[] = [],
    initialBufferPos: number = -1
  ) {
    this.queryContext = queryContext;
    this.buffer = initialBuffer;
    this.bufferPos = initialBufferPos;
    this.endOfStream = false;
    this.searchAfter = queryContext.pagination.cursorKey;
  }

  clone() {
    return new UnfilteredFetcher(this.queryContext, this.buffer.slice(0), this.bufferPos);
  }

  // Get a CursorPaginator object that will resume after the current() value.
  paginationAfterCurrent(): CursorPagination | null {
    const current = this.current();
    if (!current) {
      return null;
    }
    const cursorKey = { monitor_id: current.id };

    return Object.assign({}, this.queryContext.pagination, { cursorKey });
  }

  // Returns a copy of this fetcher that goes backwards, not forwards from the current positon
  reverse(): UnfilteredFetcher | null {
    const reverseContext = Object.assign({}, this.queryContext);
    const current = this.current();

    reverseContext.pagination = {
      cursorKey: current ? { monitor_id: current.id } : null,
      sortOrder: this.queryContext.pagination.sortOrder,
      cursorDirection:
        this.queryContext.pagination.cursorDirection === CursorDirection.AFTER
          ? CursorDirection.BEFORE
          : CursorDirection.AFTER,
    };

    return current ? new UnfilteredFetcher(reverseContext, [current], 0) : null;
  }

  // Returns the last item fetched with next(). null if no items fetched with
  // next or if next has not yet been invoked.
  current(): MonitorIdWithGroups | null {
    if (this.endOfStream) {
      return null;
    }

    return this.buffer[this.bufferPos] || null;
  }

  async next(): Promise<MonitorIdWithGroups | null> {
    if (this.endOfStream) {
      return null;
    }
    const found = this.buffer[this.bufferPos + 1];
    if (found) {
      this.bufferPos++;
      // Keep searching if we haven't matched
      if (found.matchesFilter) {
        return found;
      }
    }

    await this.queryNextAndBuffer();
    return await this.next();
  }

  async peek(): Promise<MonitorIdWithGroups | null> {
    if (this.endOfStream) {
      return null;
    }

    const bufAhead = this.buffer[this.bufferPos + 1];
    if (bufAhead) {
      return bufAhead;
    }

    await this.queryNextAndBuffer();

    return await this.peek();
  }

  async queryNextAndBuffer(size: number = 500) {
    // Trim the buffer to just the current element since we'll be fetching more
    const current = this.current();
    if (current) {
      this.buffer = [current];
      this.bufferPos = 0;
    }

    const results = await this.queryCheckGroupsPage(size);
    if (results.checkGroups.length === 0) {
      this.endOfStream = true;
      return;
    }

    results.checkGroups.forEach(mlcg => this.buffer.push(mlcg));
    this.searchAfter = results.searchAfter;
  }

  private async queryCheckGroupsPage(size: number): Promise<CheckGroupsPageResult> {
    const start = new Date();

    const filteredQueryResult = await this.filteredCheckGroupsQuery(size);
    const filteredCheckGroups = new Map<string, boolean>();
    const monitorIds: string[] = [];
    const monitorIdsMatchingStatusFilter: string[] = [];
    get<any>(filteredQueryResult, 'aggregations.monitors.buckets', []).forEach((b: any) => {
      const monitorId = b.key.monitor_id;
      monitorIds.push(monitorId);

      if (b.summaries.doc_count === 0) {
        return; // This one didn't match the status filter, so no top hits were returned
      }
      monitorIdsMatchingStatusFilter.push(monitorId);
      const checkGroup = b.summaries.top.hits.hits[0]._source.monitor.check_group;
      filteredCheckGroups.set(checkGroup, true);
    });

    const mostRecentQueryResult = await this.mostRecentCheckGroups(monitorIdsMatchingStatusFilter);
    let mostRecentGroupsForMonitorIds = new Map<string, MonitorLocCheckGroup[]>();
    mostRecentQueryResult.aggregations.monitor.buckets.forEach((monBucket: any) => {
      const monitorId: string = monBucket.key;
      const groups: MonitorLocCheckGroup[] = [];
      mostRecentGroupsForMonitorIds.set(monitorId, groups);
      monBucket.location.buckets.forEach((locBucket: any) => {
        const location = locBucket.key;
        const topSource = locBucket.top.hits.hits[0]._source;
        const checkGroup = topSource.monitor.check_group;
        const mlcg: MonitorLocCheckGroup = {
          monitorId: monitorId,
          location: location,
          checkGroup: checkGroup,
          filterMatchesLatest: filteredCheckGroups.has(checkGroup),
          timestamp: topSource['@timestamp'],
          up: topSource.summary.up,
          down: topSource.summary.down,
        };
        groups.push(mlcg);
      });
    });

    let miwgs: MonitorIdWithGroups[] = [];
    monitorIds.forEach((id: string) => {
      const mostRecentGroups = mostRecentGroupsForMonitorIds.get(id);
      miwgs.push({
        id: id,
        matchesFilter: !!mostRecentGroups,
        groups: mostRecentGroups || [],
      });
    });
    miwgs = sortBy(miwgs, miwg => miwg.id);
    if (this.queryContext.pagination.sortOrder === SortOrder.DESC) {
      miwgs.reverse();
    }

    const elapsed = new Date().getTime() - start.getTime();
    console.log('Exec Query in', elapsed, 'Len', miwgs.length, this.endOfStream);
    return {
      checkGroups: miwgs,
      searchAfter: filteredQueryResult.aggregations.monitors.after_key,
    };
  }

  private async mostRecentCheckGroups(monitorIds: string[]) {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        size: 0,
        query: {
          terms: { 'monitor.id': monitorIds },
        },
        aggs: {
          monitor: {
            terms: { field: 'monitor.id' },
            aggs: {
              location: {
                terms: { field: 'observer.geo.name', missing: 'N/A', size: 100 },
                aggs: {
                  top: {
                    top_hits: {
                      sort: [{ '@timestamp': 'desc' }],
                      _source: {
                        includes: [
                          'monitor.check_group',
                          '@timestamp',
                          'summary.up',
                          'summary.down',
                        ],
                      },
                      size: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    return await this.queryContext.database.search(this.queryContext.request, params);
  }

  private async filteredCheckGroupsQuery(size: number) {
    const body = this.filteredCheckGroupsQueryBody(size, this.searchAfter);

    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body,
    };

    return await this.queryContext.database.search(this.queryContext.request, params);
  }

  private filteredCheckGroupsQueryBody(size: number, searchAfter: any) {
    const compositeOrder = cursorDirectionToOrder(this.queryContext.pagination.cursorDirection);

    const query = this.queryContext.filterClause.filter || { match_all: {} };

    const statusFilterClause = !this.queryContext.statusFilter
      ? { exists: { field: 'summary.down' } }
      : this.queryContext.statusFilter === 'down'
      ? { range: { 'summary.down': { gt: 0 } } }
      : { match: { 'summary.down': 0 } };

    const body = {
      size: 0,
      query,
      aggs: {
        monitors: {
          composite: {
            size: size,
            sources: [
              {
                monitor_id: {
                  terms: { field: 'monitor.id', order: compositeOrder },
                },
              },
            ],
          },
          aggs: {
            summaries: {
              filter: {
                bool: { filter: [statusFilterClause] },
              },
              aggs: {
                top: {
                  top_hits: {
                    sort: [{ '@timestamp': 'desc' }],
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
  checkGroups: MonitorIdWithGroups[];
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
