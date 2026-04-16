/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryNode } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';

/**
 * Cached preloaded memories for a user, keyed by userName.
 */
interface PreloadEntry {
  memories: MemoryNode[];
  loadedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Memory preloader that eagerly loads common memories (semantic self-knowledge,
 * recent procedural, high-confidence facts) when a conversation is opened.
 *
 * The preloaded set is cached per user and served instantly when the first
 * round's beforeAgent hook fires, eliminating retrieval latency.
 */
export class MemoryPreloader {
  private readonly cache = new Map<string, PreloadEntry>();
  private readonly logger: Logger;
  private readonly maxMemories: number;

  constructor({ logger, maxMemories = 10 }: { logger: Logger; maxMemories?: number }) {
    this.logger = logger;
    this.maxMemories = maxMemories;
  }

  /**
   * Preload memories for a user. Called when a conversation view is opened.
   * Loads high-value semantic + procedural memories sorted by utility.
   */
  async preload(memoryClient: MemoryClient, userName: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Load recent high-value memories: semantic (self/preferences/work) + procedural
      const [semantic, procedural] = await Promise.all([
        memoryClient.list({
          type: 'semantic',
          status: ['established', 'consolidated', 'provisional', 'candidate'],
          size: this.maxMemories,
        }),
        memoryClient.list({
          type: 'procedural',
          status: ['established', 'consolidated', 'provisional'],
          size: 5,
        }),
      ]);

      // Combine and sort by utility + confidence
      const all = [...semantic, ...procedural]
        .sort((a, b) => {
          const scoreA = (a.utility ?? 0.5) + (a.confidence ?? 0.5) + (a.reinforcement_score ?? 0);
          const scoreB = (b.utility ?? 0.5) + (b.confidence ?? 0.5) + (b.reinforcement_score ?? 0);
          return scoreB - scoreA;
        })
        .slice(0, this.maxMemories);

      this.cache.set(userName, {
        memories: all,
        loadedAt: Date.now(),
      });

      this.logger.info(
        `preload: loaded ${all.length} memories for user=${userName} in ${Date.now() - startTime}ms`
      );
    } catch (err) {
      this.logger.warn(`preload: failed for user=${userName} — ${(err as Error).message}`);
    }
  }

  /**
   * Get preloaded memories for a user. Returns empty array if not preloaded or expired.
   * Does NOT consume the cache — it can be read multiple times within the TTL.
   */
  get(userName: string): MemoryNode[] {
    const entry = this.cache.get(userName);
    if (!entry) return [];

    if (Date.now() - entry.loadedAt > CACHE_TTL_MS) {
      this.cache.delete(userName);
      return [];
    }

    return entry.memories;
  }

  /**
   * Consume preloaded memories: returns them and clears the cache entry.
   * Used by the beforeAgent hook to grab preloaded memories on first round.
   */
  consume(userName: string): MemoryNode[] {
    const memories = this.get(userName);
    this.cache.delete(userName);
    return memories;
  }
}

// Singleton instance
let _preloader: MemoryPreloader | undefined;

export const getMemoryPreloader = (): MemoryPreloader | undefined => _preloader;

export const initMemoryPreloader = (opts: { logger: Logger; maxMemories?: number }): MemoryPreloader => {
  _preloader = new MemoryPreloader(opts);
  return _preloader;
};
