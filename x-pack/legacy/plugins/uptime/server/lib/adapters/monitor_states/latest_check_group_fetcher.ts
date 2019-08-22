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
  const fetcher = new Fetcher(queryContext);

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
      const reverseFetcher = await fetcher.reverse();
      paginationBefore = reverseFetcher && (await reverseFetcher.paginationAfterCurrent());
      console.log('END REVERSE', paginationBefore);
    }

    items.push(monitor);
  }
  console.log('Fetching done', new Date().getTime() - start.getTime(), items.length, size);

  console.log('CHECK NEXT');
  // We have to create these objects before checking if we can navigate backward
  console.log('PEEKNEXT', await fetcher.peek());
  const paginationAfter: CursorPagination | null = (await fetcher.peek())
    ? await fetcher.paginationAfterCurrent()
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

class Fetcher {
  queryContext: QueryContext;
  // Cache representing pre-fetched query results.
  // The first item is the CheckGroup this represents.
  buffer: MonitorIdWithGroups[];
  bufferPos: number;
  searchAfter: any;

  constructor(
    queryContext: QueryContext,
    initialBuffer: MonitorIdWithGroups[] = [],
    initialBufferPos: number = -1
  ) {
    this.queryContext = queryContext;
    this.buffer = initialBuffer;
    this.bufferPos = initialBufferPos;
    this.searchAfter = queryContext.pagination.cursorKey;
  }

  clone() {
    return new Fetcher(this.queryContext, this.buffer.slice(0), this.bufferPos);
  }

  // Get a CursorPaginator object that will resume after the current() value.
  async paginationAfterCurrent(): Promise<CursorPagination | null> {
    const peek = await this.peek();
    console.log('CURP', this.current());
    if (!peek) {
      console.log('PEEKED', peek);
      return null;
    }

    const current = this.current();
    if (!current) {
      return null;
    }
    console.log('PAGINATION AFTER', current.id);
    const cursorKey = { monitor_id: current.id };

    return Object.assign({}, this.queryContext.pagination, { cursorKey });
  }

  // Returns a copy of this fetcher that goes backwards, not forwards from the current positon
  reverse(): Fetcher | null {
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

    return current ? new Fetcher(reverseContext, [current], 0) : null;
  }

  // Returns the last item fetched with next(). null if no items fetched with
  // next or if next has not yet been invoked.
  current(): MonitorIdWithGroups | null {
    return this.buffer[this.bufferPos] || null;
  }

  async next(): Promise<MonitorIdWithGroups | null> {
    while (true) {
      const found = this.buffer[this.bufferPos + 1];
      if (found) {
        this.bufferPos++;
        // Keep searching if we haven't matched
        if (found.matchesFilter) {
          return found;
        }
      }

      const fetchedMore = await this.queryNextAndBuffer();
      if (!fetchedMore) {
        return null;
      }
    }
  }

  async peek(): Promise<MonitorIdWithGroups | null> {
    let bufAheadPos = this.bufferPos + 1;
    while (true) {
      console.log('PEEKITER', bufAheadPos);
      let bufAhead = this.buffer[bufAheadPos];

      if (!bufAhead) {
        console.log('PEEKMORE');
        const fetchedMore = await this.queryNextAndBuffer(500, false);
        if (!fetchedMore) {
          console.log('No more to fetch');
          return null;
        }
      }

      if (bufAhead) {
        if (bufAhead.matchesFilter) {
          console.log('PM', bufAhead);
          return bufAhead;
        }
        console.log('NOPM', bufAhead);
      }

      bufAheadPos++;
    }
  }

  async queryNextAndBuffer(size: number = 500, trim: boolean = true): Promise<boolean> {
    // Trim the buffer to just the current element since we'll be fetching more
    const current = this.current();
    if (current && trim) {
      this.buffer = [current];
      this.bufferPos = 0;
    }

    const results = await this.queryCheckGroupsPage(size);
    if (results.checkGroups.length === 0) {
      return false;
    }

    results.checkGroups.forEach(mlcg => this.buffer.push(mlcg));
    this.searchAfter = results.searchAfter;

    return true;
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

    let mostRecentGroupsForMonitorIds = new Map<string, MonitorLocCheckGroup[]>();
    if (monitorIdsMatchingStatusFilter.length > 0) {
      const mostRecentQueryResult = await this.mostRecentCheckGroups(
        monitorIdsMatchingStatusFilter
      );
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
    }

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
    if (this.queryContext.pagination.cursorDirection === CursorDirection.BEFORE) {
      miwgs.reverse();
    }

    const elapsed = new Date().getTime() - start.getTime();
    console.log('Exec Query in', elapsed, 'Len', miwgs.length);
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
            terms: { field: 'monitor.id', size: monitorIds.length },
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
