/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActiveMemorySet } from './active_memory_set';

/**
 * Manages per-run ActiveMemorySet instances.
 *
 * Each agent execution round is identified by its runId. The session manager
 * creates (and caches) an ActiveMemorySet per runId, allowing all memory tools
 * within a given round to share state.
 *
 * Sessions are automatically cleaned up based on TTL to prevent memory leaks.
 */
export class MemorySessionManager {
  /** Map from runId to { set, createdAt } */
  private readonly sessions: Map<string, { set: ActiveMemorySet; createdAt: number }> = new Map();

  /** Session TTL in milliseconds (default: 30 minutes). */
  private readonly ttlMs: number;

  constructor({ ttlMs = 30 * 60 * 1000 }: { ttlMs?: number } = {}) {
    this.ttlMs = ttlMs;
  }

  /**
   * Get or create an ActiveMemorySet for the given runId.
   *
   * If no session exists for this runId, a new ActiveMemorySet is created.
   * Triggers cleanup of expired sessions as a side effect.
   */
  getOrCreate(runId: string): ActiveMemorySet {
    this.evictExpired();

    const existing = this.sessions.get(runId);
    if (existing) {
      return existing.set;
    }

    const set = new ActiveMemorySet();
    this.sessions.set(runId, { set, createdAt: Date.now() });
    return set;
  }

  /**
   * Explicitly delete a session by runId.
   * Called after a round completes to free memory promptly.
   */
  delete(runId: string): void {
    this.sessions.delete(runId);
  }

  /**
   * Return the number of active sessions (for debugging/metrics).
   */
  size(): number {
    return this.sessions.size;
  }

  /**
   * Remove sessions older than the configured TTL.
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [runId, session] of this.sessions.entries()) {
      if (now - session.createdAt > this.ttlMs) {
        this.sessions.delete(runId);
      }
    }
  }
}
