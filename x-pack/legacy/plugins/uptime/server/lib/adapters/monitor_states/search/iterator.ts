/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryContext } from '../elasticsearch_monitor_states_adapter';
import { CursorPagination } from '../adapter_types';
import { MonitorGroups } from '../monitor_id_with_groups';
import {searchChunk} from "./search_chunk";
import {CursorDirection} from "../../../../../common/graphql/types";

export class MonitorIterator {
  queryContext: QueryContext;
  // Cache representing pre-fetched query results.
  // The first item is the CheckGroup this represents.
  buffer: MonitorGroups[];
  bufferPos: number;
  searchAfter: any;

  constructor(
    queryContext: QueryContext,
    initialBuffer: MonitorGroups[] = [],
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
    if (!peek) {
      return null;
    }

    const current = this.current();
    if (!current) {
      return null;
    }
    const cursorKey = { monitor_id: current.id };

    return Object.assign({}, this.queryContext.pagination, { cursorKey });
  }

  async paginationBeforeCurrent(): Promise<CursorPagination | null> {
    const reverseFetcher = await this.reverse();
    return reverseFetcher && (await reverseFetcher.paginationAfterCurrent());
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
  current(): MonitorGroups | null {
    return this.buffer[this.bufferPos] || null;
  }

  async next(): Promise<MonitorGroups | null> {
    while (true) {
      const found = this.buffer[this.bufferPos + 1];
      if (found) {
        this.bufferPos++;
        return found;
      }

      // Keep searching if we haven't matched
      const fetchedMore = await this.queryNextAndBuffer();
      if (!fetchedMore) {
        return null;
      }
    }
  }

  async peek(): Promise<MonitorGroups | null> {
    let bufAheadPos = this.bufferPos + 1;
    while (true) {
      const bufAhead = this.buffer[bufAheadPos];

      if (!bufAhead) {
        const fetchedMore = await this.queryNextAndBuffer(500, false);
        if (!fetchedMore) {
          return null;
        }
      }

      if (bufAhead) {
        return bufAhead;
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

    const results = await searchChunk(this.queryContext, this.searchAfter, size);
    if (results.monitorIdGroups.length === 0) {
      return false;
    }

    results.monitorIdGroups.forEach((mig: MonitorGroups) => this.buffer.push(mig));
    this.searchAfter = results.searchAfter;

    return true;
  }
}
