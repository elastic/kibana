/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { Logger } from '@kbn/core/server';

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// Persistent MCP sessions; do not raise without sizing.
const MAX_ENTRIES = 1000;

interface PoolEntry<TClient> {
  promise: Promise<TClient>;
  terminate: (client: TClient) => Promise<void>;
  terminationPromise?: Promise<void>;
  /** Callers that acquired the entry and have not released it yet. */
  activeUses: number;
  /** Resolvers waiting for `activeUses` to drop to 0 before terminating. */
  idleWaiters: Array<() => void>;
}

export interface ClientLease<TClient> {
  promise: Promise<TClient>;
  /** Marks this use as finished. Idempotent. Call before awaiting `invalidate`. */
  release: () => void;
}

export class LeasePool<TClient> {
  private readonly cache: LRUCache<string, PoolEntry<TClient>>;
  /** Entries removed from the cache can still have active users that need to release. */
  private readonly entriesByPromise = new WeakMap<Promise<TClient>, PoolEntry<TClient>>();
  /** Terminations still running for keys already removed from the cache, so evict can await them. */
  private readonly pendingTerminations = new Map<string, Set<Promise<void>>>();
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

    // Defer buildFn so synchronous throws reject after the entry is cached.
    const promise = Promise.resolve().then(buildFn);
    // The `peek` identity check avoids deleting or refreshing a replacement in the rejection
    // microtask.
    promise.catch(() => {
      if (this.cache.peek(key)?.promise === promise) {
        this.cache.delete(key);
      }
    });

    const entry: PoolEntry<TClient> = { promise, terminate, activeUses: 0, idleWaiters: [] };
    this.entriesByPromise.set(promise, entry);
    this.cache.set(key, entry);
    return promise;
  }

  /**
   * Leases a client and counts the caller as an active user. Termination (invalidate, evict,
   * idle expiry, stop) waits until every active user has released, so one operation's terminal
   * error cannot close a transport another operation is still using.
   */
  acquire(
    key: string,
    buildFn: () => Promise<TClient>,
    terminate: (client: TClient) => Promise<void>
  ): ClientLease<TClient> {
    const promise = this.lease(key, buildFn, terminate);
    const entry = this.entriesByPromise.get(promise);
    if (entry !== undefined) {
      entry.activeUses++;
    }

    let released = false;
    const release = () => {
      if (released || entry === undefined) {
        return;
      }
      released = true;
      entry.activeUses = Math.max(0, entry.activeUses - 1);
      if (entry.activeUses === 0) {
        const waiters = entry.idleWaiters.splice(0);
        waiters.forEach((resolve) => resolve());
      }
    };

    return { promise, release };
  }

  /**
   * Removes the entry so new leases rebuild. Termination runs right away when nobody else holds
   * an `acquire` lease; otherwise it runs when the last active user releases, and this call does
   * not wait for that, so a failing operation is not delayed by unrelated in-flight work.
   */
  async invalidate(key: string, promise: Promise<TClient>): Promise<void> {
    const entry = this.cache.peek(key);
    if (entry === undefined || entry.promise !== promise) {
      return;
    }

    this.cache.delete(key);
    const termination = this.terminateEntry(entry, key);
    if (entry.activeUses === 0) {
      await termination;
    }
  }

  /**
   * Await termination so connector deletion and OAuth disconnect can remove credentials afterward.
   * Waits for active `acquire` users to release first, so a running operation is not cut off.
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

    const pending = [...this.pendingTerminations.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .flatMap(([, terminations]) => [...terminations]);

    await Promise.all([
      ...entriesToTerminate.map(({ entry, key }) => this.terminateEntry(entry, key)),
      ...pending,
    ]);
  }

  stop(): void {
    this.cache.clear();
  }

  /** Memoizes termination so `dispose` and explicit awaits do not terminate the client twice. */
  private terminateEntry(entry: PoolEntry<TClient>, key: string): Promise<void> {
    if (entry.terminationPromise !== undefined) {
      return entry.terminationPromise;
    }

    const termination = this.runTermination(entry, key);
    entry.terminationPromise = termination;

    const pendingForKey = this.pendingTerminations.get(key) ?? new Set<Promise<void>>();
    pendingForKey.add(termination);
    this.pendingTerminations.set(key, pendingForKey);
    void termination.finally(() => {
      pendingForKey.delete(termination);
      if (pendingForKey.size === 0 && this.pendingTerminations.get(key) === pendingForKey) {
        this.pendingTerminations.delete(key);
      }
    });

    return termination;
  }

  private runTermination(entry: PoolEntry<TClient>, key: string): Promise<void> {
    return (async () => {
      if (entry.activeUses > 0) {
        this.logger?.debug(
          `Deferring termination for key "${key}" until ${entry.activeUses} active use(s) release`
        );
        await new Promise<void>((resolve) => entry.idleWaiters.push(resolve));
      }

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
  }
}
