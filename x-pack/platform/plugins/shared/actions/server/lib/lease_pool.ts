/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { Logger } from '@kbn/core/server';

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 1000;

interface PoolEntry<TClient> {
  promise: Promise<TClient>;
  terminate: (client: TClient) => Promise<void>;
  terminationPromise?: Promise<void>;
}

export class LeasePool<TClient> {
  private readonly cache: LRUCache<string, PoolEntry<TClient>>;
  private readonly logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
    this.cache = new LRUCache<string, PoolEntry<TClient>>({
      ttl: IDLE_TIMEOUT_MS,
      ttlAutopurge: true,
      ttlResolution: 0,
      updateAgeOnGet: true,
      max: MAX_ENTRIES,
      dispose: (value, key) => {
        void this.terminateEntry(value, key);
      },
    });
  }

  lease(
    key: string,
    buildFn: () => Promise<TClient>,
    terminate: (client: TClient) => Promise<void>
  ): Promise<TClient> {
    const existing = this.cache.get(key);
    if (existing !== undefined) {
      this.logger?.debug(`Reusing pooled client for key "${key}"`);
      return existing.promise;
    }

    this.logger?.debug(`Building new pooled client for key "${key}"`);

    // Deferred rather than `buildFn()` so a `build` that throws synchronously still rejects the
    // returned promise instead of throwing out of `lease` before the entry is cached.
    const promise = Promise.resolve().then(buildFn);
    // A failed build must not stay cached as a broken entry, so drop the key and let the next
    // caller rebuild. `promise` itself is returned unmodified so the caller still sees the error.
    // The guard matters because this runs a microtask after `cache.set`: by then the key may have
    // been evicted and re-leased, and a losing build must not delete its replacement. `peek`
    // rather than `get`, so an error path does not reset the replacement's idle timer.
    promise.catch(() => {
      if (this.cache.peek(key)?.promise === promise) {
        this.cache.delete(key);
      }
    });

    const entry: PoolEntry<TClient> = { promise, terminate };
    this.cache.set(key, entry);
    return promise;
  }

  /**
   * Terminates every pooled client belonging to one connector, now, rather than waiting for the
   * idle timer. A connector can own several entries (multiple client types, multiple user
   * profiles, lingering older revisions), hence the prefix scan; `connectorId` is the first key
   * component to make that possible, and is encoded so one connector's prefix cannot match
   * another's.
   *
   * Awaited, because callers depend on the ordering: connector delete and OAuth disconnect must
   * finish terminating (which may require an authenticated call to the remote service) before the
   * credentials that termination needs are removed.
   */
  async evict(connectorId: string): Promise<void> {
    const prefix = `${encodeURIComponent(connectorId)}:`;
    const keysToEvict = [...this.cache.keys()].filter((key) => key.startsWith(prefix));
    const entriesToTerminate = keysToEvict.flatMap((key) => {
      const entry = this.cache.peek(key);
      return entry === undefined ? [] : [{ entry, key }];
    });

    for (const key of keysToEvict) {
      this.cache.delete(key);
    }

    await Promise.all(entriesToTerminate.map(({ entry, key }) => this.terminateEntry(entry, key)));
  }

  stop(): void {
    this.cache.clear();
  }

  /**
   * Returns a promise so `evict` can await completion, which is what gives connector delete and
   * OAuth disconnect their ordering guarantee.
   *
   * Memoized: `evict` deletes the key, which fires `dispose`, which calls this, and then awaits
   * this again on the entry it collected. Without the memo `terminate` would run twice on the same
   * client.
   */
  private terminateEntry(entry: PoolEntry<TClient>, key: string): Promise<void> {
    entry.terminationPromise ??= (async () => {
      let client: TClient;
      try {
        // The entry may still hold an in-flight build, so there may be nothing open yet.
        client = await entry.promise;
      } catch {
        // The build failed, so nothing was opened, and the error already surfaced to whoever
        // called `lease`.
        return;
      }

      try {
        await entry.terminate(client);
      } catch (err) {
        this.logger?.warn(`Failed to terminate client for key "${key}": ${err.message}`);
      }
    })();

    return entry.terminationPromise;
  }
}
