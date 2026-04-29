/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type StringifiedQueryKey = string;
type UpdatedTimestamp = number;

const DEFAULT_EXPIRATION_MS = 60000;
export class PopulatedFieldsCacheManager {
  private _resultsCache = new Map<StringifiedQueryKey, any>();
  private readonly _lastUpdatedTimestamps = new Map<StringifiedQueryKey, UpdatedTimestamp>();

  constructor(private readonly _expirationDurationMs = DEFAULT_EXPIRATION_MS) {}

  private clearOldCacheIfNeeded() {
    if (this._resultsCache.size > 10) {
      this._resultsCache.clear();
      this._lastUpdatedTimestamps.clear();
    }
  }

  private clearExpiredCache(key: StringifiedQueryKey) {
    // If result is available but past the expiration duration, clear cache
    const lastUpdatedTs = this._lastUpdatedTimestamps.get(key);
    const now = Date.now();
    if (lastUpdatedTs !== undefined && lastUpdatedTs - now > this._expirationDurationMs) {
      this._resultsCache.delete(key);
    }
  }

  public get(key: StringifiedQueryKey) {
    return this._resultsCache.get(key);
  }

  public set(key: StringifiedQueryKey, value: any) {
    this.clearExpiredCache(key);
    this.clearOldCacheIfNeeded();

    this._resultsCache.set(key, Date.now());
    this._resultsCache.set(key, value);
  }
}
