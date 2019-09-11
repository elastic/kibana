/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryContext } from '../elasticsearch_monitor_states_adapter';
import { CursorPagination } from '../adapter_types';
import { fetchChunk } from './fetch_chunk';
import { CursorDirection } from '../../../../../common/graphql/types';
import { MonitorGroups } from './fetch_page';

// Hardcoded chunk size for how many monitors to fetch at a time when querying
export const CHUNK_SIZE = 1000;

// Function that fetches a chunk of data used in iteration
export type ChunkFetcher = (
  queryContext: QueryContext,
  searchAfter: any,
  size: number
) => Promise<ChunkResult>;

// Result of fetching more results from the search.
export interface ChunkResult {
  monitorGroups: MonitorGroups[];
  searchAfter: any;
}

export class MonitorGroupIterator {
  queryContext: QueryContext;
  // Cache representing pre-fetched query results.
  // The first item is the CheckGroup this represents.
  buffer: MonitorGroups[];
  bufferPos: number;
  searchAfter: any;
  chunkFetcher: ChunkFetcher;

  constructor(
    queryContext: QueryContext,
    initialBuffer: MonitorGroups[] = [],
    initialBufferPos: number = -1,
    chunkFetcher: ChunkFetcher = fetchChunk
  ) {
    this.queryContext = queryContext;
    this.buffer = initialBuffer;
    this.bufferPos = initialBufferPos;
    this.searchAfter = queryContext.pagination.cursorKey;
    this.chunkFetcher = chunkFetcher;
  }

  clone() {
    return new MonitorGroupIterator(this.queryContext, this.buffer.slice(0), this.bufferPos);
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

  // Returns a copy of this fetcher that goes backwards from the current positon
  reverse(): MonitorGroupIterator | null {
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

    return current
      ? new MonitorGroupIterator(reverseContext, [current], 0, this.chunkFetcher)
      : null;
  }

  // Returns the last item fetched with next(). null if no items fetched with
  // next or if next has not yet been invoked.
  current(): MonitorGroups | null {
    return this.buffer[this.bufferPos] || null;
  }

  async next(): Promise<MonitorGroups | null> {
    await this.bufferNext(CHUNK_SIZE, false);

    const found = this.buffer[this.bufferPos + 1];
    if (found) {
      this.bufferPos++;
      return found;
    }
    return null;
  }

  async peek(): Promise<MonitorGroups | null> {
    await this.bufferNext(CHUNK_SIZE, false);
    return this.buffer[this.bufferPos + 1] || null;
  }

  async bufferNext(size: number = CHUNK_SIZE, trim: boolean = true): Promise<void> {
    // The next element is already buffered.
    if (this.buffer[this.bufferPos + 1]) {
      return;
    }

    while (true) {
      const result = await this.attemptBufferMore(CHUNK_SIZE, trim);
      if (result.gotHit || !result.hasMore) {
        return;
      }
    }
  }

  async attemptBufferMore(
    size: number = CHUNK_SIZE,
    trim: boolean = true
  ): Promise<{ hasMore: boolean; gotHit: boolean }> {
    // Trim the buffer to just the current element since we'll be fetching more
    const current = this.current();
    if (current && trim) {
      this.buffer = [current];
      this.bufferPos = 0;
    }

    const results = await this.chunkFetcher(this.queryContext, this.searchAfter, size);
    // If we've hit the end of the stream searchAfter will be empty

    results.monitorGroups.forEach((mig: MonitorGroups) => this.buffer.push(mig));
    if (results.searchAfter) {
      this.searchAfter = results.searchAfter;
    }

    return {
      gotHit: results.monitorGroups.length > 0,
      hasMore: !!results.searchAfter,
    };
  }
}
