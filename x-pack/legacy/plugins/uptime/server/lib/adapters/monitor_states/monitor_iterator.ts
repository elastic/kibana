import { CursorDirection } from '../../../../common/graphql/types';
import { QueryContext } from './elasticsearch_monitor_states_adapter';
import { get, sortBy } from 'lodash';
import { CursorPagination } from './adapter_types';
import { mostRecentCheckGroups } from './most_recent_check_groups_query';
import { MonitorLocCheckGroup } from './monitor_loc_check_group';
import { MonitorIdWithGroups } from './monitor_id_with_groups';
import { filteredCheckGroupsQuery, CheckGroupsPageResult } from './filtered_check_groups_query';

export class MonitorIterator {
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
    return new MonitorIterator(this.queryContext, this.buffer.slice(0), this.bufferPos);
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
  reverse(): MonitorIterator | null {
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

    return current ? new MonitorIterator(reverseContext, [current], 0) : null;
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

    const filteredQueryResult = await filteredCheckGroupsQuery(
      this.queryContext,
      this.searchAfter,
      size
    );
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

    let recentGroupsMatchingStatus = new Map<string, MonitorLocCheckGroup[]>();
    if (monitorIdsMatchingStatusFilter.length > 0) {
      const mostRecentQueryResult = await mostRecentCheckGroups(
        this.queryContext,
        monitorIdsMatchingStatusFilter
      );
      MonitorLoop: for (const monBucket of mostRecentQueryResult.aggregations.monitor.buckets) {
        const monitorId: string = monBucket.key;
        const groups: MonitorLocCheckGroup[] = [];
        LocationLoop: for (const locBucket of monBucket.location.buckets) {
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

          const locationStatus = topSource.down ? 'down' : 'up';

          // This monitor doesn't match, so just skip ahead
          if (this.queryContext.statusFilter && this.queryContext.statusFilter !== locationStatus) {
            continue MonitorLoop;
          }
          groups.push(mlcg);
        }
        recentGroupsMatchingStatus.set(monitorId, groups);
      }
    }

    let miwgs: MonitorIdWithGroups[] = [];
    monitorIds.forEach((id: string) => {
      const mostRecentGroups = recentGroupsMatchingStatus.get(id);
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
}
