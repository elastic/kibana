/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { Logger } from '@kbn/core/server';
import type { JsonValue } from '@kbn/utility-types';
import { safeOutputSize } from '../step/errors';

export type StepIoType = 'input' | 'output';

/**
 * Cached IO value stamped with the step-execution id that produced it.
 * A hit is valid only when `executionId` matches the requested execution.
 */
export interface StepIoCacheEntry {
  value: JsonValue | null;
  executionId: string;
}

// lru-cache only accepts positive integer sizes; unmeasured or empty values count as 1 byte.
const toValidSize = (bytes: number | null | undefined): number =>
  bytes != null && Number.isFinite(bytes) ? Math.max(1, Math.ceil(bytes)) : 1;

/**
 * Byte-bounded LRU for step IO. Keys are opaque strings supplied by
 * {@link StepIoService} (composed as `type` + accessibility `contextId`).
 * Entries carry `executionId` so a hit can be validated against the request.
 */
export class StepIoCache {
  private readonly lru: LRUCache<string, StepIoCacheEntry>;

  /**
   * @param maxBytes Byte budget. `Infinity` means no eviction. `0` (or less) keeps
   * nothing resident: lru-cache treats a `maxSize` of 0 as unbounded and rejects
   * non-finite values, so both are mapped to valid sizes here.
   */
  constructor(maxBytes: number, logger?: Logger) {
    const cacheLogger = logger?.get('step_io_cache');
    let maxSize = 1;
    if (maxBytes > 0) {
      maxSize = Number.isFinite(maxBytes) ? Math.floor(maxBytes) || 1 : Number.MAX_SAFE_INTEGER;
    }
    this.lru = new LRUCache({
      maxSize,
      // Fallback size used when the caller does not supply an explicit byte count.
      sizeCalculation: (entry: StepIoCacheEntry) => toValidSize(safeOutputSize(entry.value)),
      dispose: cacheLogger
        ? (_entry, key, reason) => {
            if (reason === 'evict') {
              cacheLogger.debug(
                `evicted step output [key=${key}] [cacheBytes=${this.lru.calculatedSize}]`
              );
            }
          }
        : undefined,
    });
  }

  public get(key: string): StepIoCacheEntry | undefined {
    return this.lru.get(key);
  }

  /**
   * Stores a step IO value. When `bytes` is supplied it is used directly
   * (caller already knows the size, avoids a redundant JSON.stringify).
   * When omitted, `sizeCalculation` measures the entry automatically.
   */
  public set(key: string, entry: StepIoCacheEntry, bytes?: number): void {
    this.lru.set(key, entry, bytes !== undefined ? { size: toValidSize(bytes) } : undefined);
  }

  public has(key: string): boolean {
    return this.lru.has(key);
  }

  public delete(key: string): void {
    this.lru.delete(key);
  }

  public get totalBytes(): number {
    return this.lru.calculatedSize;
  }

  public get size(): number {
    return this.lru.size;
  }
}
