/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryNode, MemoryType } from '@kbn/agent-builder-common';

// ---------------------------------------------------------------------------
// Type-specific decay lambda values
// ---------------------------------------------------------------------------

/**
 * Recency decay lambdas: exp(-lambda * days_since_last_use)
 * - episodic:   lambda=0.1  (~10 day half-life)
 * - semantic:   lambda=0.03 (~33 day half-life)
 * - procedural: lambda=0.01 (~100 day half-life)
 */
const RECENCY_DECAY_LAMBDA: Record<MemoryType, number> = {
  episodic: 0.1,
  semantic: 0.03,
  procedural: 0.01,
};

/**
 * Utility decay: if access_count stagnates for 30+ days → utility -= 0.02/day
 */
const UTILITY_DECAY_STAGNATION_DAYS = 30;
const UTILITY_DECAY_RATE_PER_DAY = 0.02;

/**
 * Confidence decay for suspect memories: confidence -= 0.01/day
 */
const SUSPECT_CONFIDENCE_DECAY_PER_DAY = 0.01;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface DecayResult {
  /** ID of the memory node that was processed */
  memory_id: string;

  /**
   * New recency decay factor (exp(-lambda * days_since_last_use)).
   * This is a multiplier applied to scoring, not a direct field update.
   * Stored as a computed value for use by the scoring service.
   */
  recency_decay_factor: number;

  /** Updated utility value (only present if utility changed) */
  utility?: number;

  /** Updated confidence value (only present if confidence changed) */
  confidence?: number;

  /** Number of days since this memory was last used */
  days_since_last_use: number;

  /** Memory type (for audit / logging) */
  memory_type: MemoryType;
}

// ---------------------------------------------------------------------------
// DecayService
// ---------------------------------------------------------------------------

/**
 * Applies time-based score decay to memory nodes.
 *
 * Called by the nightly consolidation task to keep scores calibrated
 * with actual memory usage patterns. Decay is type-specific, ensuring
 * episodic memories fade faster than procedural ones.
 *
 * Decay effects applied:
 *   1. Recency decay:  exp(-lambda * days_since_last_use) — type-specific
 *   2. Utility decay:  if access_count stagnates 30+ days → utility -= 0.02/day
 *   3. Confidence decay: 'suspect' memories → confidence -= 0.01/day
 */
export class DecayService {
  private readonly logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  /**
   * Apply decay to a batch of memory nodes.
   *
   * Returns an array of DecayResult describing the computed field updates.
   * Callers are responsible for persisting the updates via MemoryClient.
   *
   * @param memories - Array of MemoryNode instances to evaluate
   * @param now - Reference time for decay calculation (defaults to Date.now(); injectable for tests)
   */
  applyDecay(memories: MemoryNode[], now: Date = new Date()): DecayResult[] {
    const results: DecayResult[] = [];
    const nowMs = now.getTime();

    for (const memory of memories) {
      try {
        const result = this.computeDecay(memory, nowMs);
        results.push(result);
      } catch (err) {
        this.logger.warn(
          `DecayService: failed to compute decay for memory ${memory.id} — ${(err as Error).message}`
        );
      }
    }

    this.logger.debug(`DecayService: computed decay for ${results.length} memories`);
    return results;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private computeDecay(memory: MemoryNode, nowMs: number): DecayResult {
    const lambda = RECENCY_DECAY_LAMBDA[memory.type] ?? RECENCY_DECAY_LAMBDA.semantic;

    // Resolve the last-use timestamp: prefer last_used_at, fall back to recency, then updated_at
    const lastUseIso = memory.last_used_at ?? memory.recency ?? memory.updated_at;
    const lastUseMs = Date.parse(lastUseIso);
    const daysSinceLastUse = isNaN(lastUseMs)
      ? 0
      : Math.max(0, (nowMs - lastUseMs) / (1000 * 60 * 60 * 24));

    // 1. Recency decay factor (used by scoring, not stored as a field directly)
    const recencyDecayFactor = Math.exp(-lambda * daysSinceLastUse);

    const result: DecayResult = {
      memory_id: memory.id,
      recency_decay_factor: recencyDecayFactor,
      days_since_last_use: daysSinceLastUse,
      memory_type: memory.type,
    };

    // 2. Utility decay for stagnating access
    const lastUsedMs = memory.last_used_at ? Date.parse(memory.last_used_at) : NaN;
    const daysSinceUsed = isNaN(lastUsedMs)
      ? Infinity
      : Math.max(0, (nowMs - lastUsedMs) / (1000 * 60 * 60 * 24));

    if (daysSinceUsed >= UTILITY_DECAY_STAGNATION_DAYS) {
      const stagnationDays = daysSinceUsed - UTILITY_DECAY_STAGNATION_DAYS;
      const utilityPenalty = stagnationDays * UTILITY_DECAY_RATE_PER_DAY;
      const currentUtility = memory.utility ?? 0.5;
      const newUtility = clamp(currentUtility - utilityPenalty, 0, 1.0);
      if (newUtility !== currentUtility) {
        result.utility = newUtility;
        this.logger.debug(
          `DecayService: utility decay on ${memory.id}: ${currentUtility.toFixed(3)} → ${newUtility.toFixed(3)} (stagnation ${stagnationDays.toFixed(1)} days)`
        );
      }
    }

    // 3. Confidence decay for suspect memories
    if (memory.status === 'suspect') {
      const currentConfidence = memory.confidence ?? 0.5;
      const confidencePenalty = daysSinceLastUse * SUSPECT_CONFIDENCE_DECAY_PER_DAY;
      const newConfidence = clamp(currentConfidence - confidencePenalty, 0, 1.0);
      if (newConfidence !== currentConfidence) {
        result.confidence = newConfidence;
        this.logger.debug(
          `DecayService: suspect confidence decay on ${memory.id}: ${currentConfidence.toFixed(3)} → ${newConfidence.toFixed(3)}`
        );
      }
    }

    return result;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
