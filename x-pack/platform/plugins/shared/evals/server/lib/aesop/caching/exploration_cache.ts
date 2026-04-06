/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Exploration Cache
 *
 * Production performance optimization:
 * - Cache schema discoveries (TTL: 24h)
 * - Cache relationship validations (TTL: 1h)
 * - Cache LLM categorizations (TTL: 6h)
 *
 * Reduces redundant ES queries and LLM calls when re-exploring same environment.
 */

import type { Logger } from '@kbn/logging';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export class ExplorationCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  constructor(
    private readonly logger: Logger,
    private readonly defaultTTLMs: number = 3600000 // 1 hour default
  ) {}

  /**
   * Get cached value if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.logger.debug(`[AESOP Cache] Expired: ${key}`);
      return null;
    }

    const ageMs = Date.now() - entry.createdAt;
    const ttlRemainingMs = entry.expiresAt - Date.now();
    this.logger.debug(
      `[AESOP Cache] Hit: ${key} (age_ms=${ageMs}, ttl_remaining_ms=${ttlRemainingMs})`
    );

    return entry.value as T;
  }

  /**
   * Set cache value with TTL
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTLMs;

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });

    this.logger.debug(`[AESOP Cache] Set: ${key} (ttl_ms=${ttl})`);
  }

  /**
   * Invalidate specific key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.logger.debug(`[AESOP Cache] Invalidated: ${key}`);
  }

  /**
   * Invalidate all keys matching pattern
   */
  invalidatePattern(pattern: RegExp): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.logger.debug(`[AESOP Cache] Invalidated ${count} keys matching pattern: ${pattern}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug(`[AESOP Cache] Cleared all ${size} entries`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());

    return {
      total_entries: this.cache.size,
      expired_entries: entries.filter((e) => now > e.expiresAt).length,
      valid_entries: entries.filter((e) => now <= e.expiresAt).length,
      oldest_entry_age_ms:
        entries.length > 0 ? Math.max(...entries.map((e) => now - e.createdAt)) : 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// CACHE KEYS (Standardized)
// ═══════════════════════════════════════════════════════════════

export const CACHE_KEYS = {
  // Schema discoveries (24h TTL)
  schemaDiscovery: (indices: string[]) => `schema:${indices.sort().join(',')}`,

  // Relationship validations (1h TTL)
  relationshipValidation: (from: string, to: string, via: string) =>
    `relationship:${from}:${to}:${via}`,

  // LLM categorizations (6h TTL)
  indexCategorization: (indicesHash: string) => `categorization:${indicesHash}`,

  // Pattern mining (30min TTL - patterns change frequently)
  patternMining: (personaRole: string, timeRange: string) => `patterns:${personaRole}:${timeRange}`,
};

export const CACHE_TTLS = {
  SCHEMA_DISCOVERY: 24 * 3600000, // 24 hours
  RELATIONSHIP_VALIDATION: 3600000, // 1 hour
  INDEX_CATEGORIZATION: 6 * 3600000, // 6 hours
  PATTERN_MINING: 30 * 60000, // 30 minutes
};
