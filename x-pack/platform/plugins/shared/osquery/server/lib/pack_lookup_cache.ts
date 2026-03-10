/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackSavedObject } from '../common/types';

export interface CachedPackSO {
  id: string;
  attributes: PackSavedObject;
}

interface PackCacheEntry {
  packSOs: CachedPackSO[];
  createdAt: number;
}

const PACK_CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Per-space cache of pack saved objects.
 * Entries expire after 1 minute (TTL) and are also
 * invalidated on pack create/update/delete/copy operations.
 */
export class PackLookupCache {
  private cache = new Map<string, PackCacheEntry>();

  public get(spaceId: string): CachedPackSO[] | undefined {
    const entry = this.cache.get(spaceId);
    if (!entry) return undefined;
    if (Date.now() - entry.createdAt > PACK_CACHE_TTL_MS) {
      this.cache.delete(spaceId);

      return undefined;
    }

    return entry.packSOs;
  }

  public set(spaceId: string, packSOs: CachedPackSO[]): void {
    this.cache.set(spaceId, { packSOs, createdAt: Date.now() });
  }

  public invalidate(spaceId: string): void {
    this.cache.delete(spaceId);
  }

  public invalidateAll(): void {
    this.cache.clear();
  }
}
