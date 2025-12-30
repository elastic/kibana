/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { INTERNAL_API_BASE_PATH } from '../../../../../../../common/constants';

interface IndexDocCountsResponse {
  counts: Record<string, number>;
  errors: Record<string, { message: string }>;
}

interface IndexDocCountBatcher {
  request: (indexName: string) => Promise<number>;
}

class IndexDocCountBatcherImpl implements IndexDocCountBatcher {
  private pending = new Map<
    string,
    Array<{ resolve: (count: number) => void; reject: (error: Error) => void }>
  >();
  private queued = new Set<string>();

  private flushScheduled = false;
  private inFlight = false;
  private inFlightIndexNames = new Set<string>();

  constructor(private readonly httpSetup: HttpSetup) {}

  request(indexName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const queue = this.pending.get(indexName) ?? [];
      queue.push({ resolve, reject });
      this.pending.set(indexName, queue);

      // If this index is already part of the in-flight batch, it will be resolved/rejected
      // when that batch completes. Don't enqueue a duplicate request.
      if (!this.inFlightIndexNames.has(indexName)) {
        this.queued.add(indexName);
      }

      this.scheduleDrain();
    });
  }

  private scheduleDrain() {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    Promise.resolve().then(() => this.drain());
  }

  private takeQueuedBatch(): string[] {
    const indexNames = Array.from(this.queued);
    this.queued.clear();
    return indexNames;
  }

  private fetchBatch(indexNames: string[]): Promise<IndexDocCountsResponse> {
    return this.httpSetup.post<IndexDocCountsResponse>(
      `${INTERNAL_API_BASE_PATH}/index_doc_counts`,
      { body: JSON.stringify({ indexNames }) }
    );
  }

  private resolveBatch(indexNames: string[], response: IndexDocCountsResponse) {
    for (const indexName of indexNames) {
      const resolvers = this.pending.get(indexName) ?? [];
      this.pending.delete(indexName);

      const count = response.counts?.[indexName];
      const perIndexError = response.errors?.[indexName];

      if (typeof count === 'number') {
        for (const { resolve } of resolvers) {
          resolve(count);
        }
        continue;
      }

      const err = new Error(perIndexError?.message ?? 'Failed to load document count');
      for (const { reject } of resolvers) {
        reject(err);
      }
    }
  }

  private rejectBatch(indexNames: string[], error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    for (const indexName of indexNames) {
      const resolvers = this.pending.get(indexName) ?? [];
      this.pending.delete(indexName);
      for (const { reject } of resolvers) {
        reject(err);
      }
    }
  }

  private async drain() {
    this.flushScheduled = false;
    if (this.inFlight) return;
    this.inFlight = true;

    try {
      // Process queued items in serial batches. Any new requests that come in while a batch is
      // in-flight get added to `queued` and will be picked up by the next loop iteration.
      while (this.queued.size > 0) {
        const indexNames = this.takeQueuedBatch();
        this.inFlightIndexNames = new Set(indexNames);

        try {
          const response = await this.fetchBatch(indexNames);
          this.resolveBatch(indexNames, response);
        } catch (error) {
          // Reject all pending requests for this batch on transport failure, but keep the
          // batcher alive so subsequent queued requests can still be processed.
          this.rejectBatch(indexNames, error);
        } finally {
          // If more requests came in while this batch was in-flight, they will have been queued
          // and the loop will continue.
          this.inFlightIndexNames.clear();
        }
      }
    } finally {
      this.inFlightIndexNames.clear();
      this.inFlight = false;

      // If new items were queued after we decided to stop draining, ensure we schedule another run.
      if (this.queued.size > 0) {
        this.scheduleDrain();
      }
    }
  }
}

const batchers = new WeakMap<HttpSetup, IndexDocCountBatcher>();
const getBatcher = (httpSetup: HttpSetup) => {
  const existing = batchers.get(httpSetup);
  if (existing) return existing;
  const created = new IndexDocCountBatcherImpl(httpSetup);
  batchers.set(httpSetup, created);
  return created;
};

export const getIndexDocCount = (httpSetup: HttpSetup, indexName: string): Promise<number> => {
  return getBatcher(httpSetup).request(indexName);
};
