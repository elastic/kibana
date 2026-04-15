/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryNode } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';
import { DecayService } from '../lifecycle/decay_service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 'deprecated' memories older than this are eligible for hard-delete */
const DEPRECATED_HARD_DELETE_DAYS = 30;

/** 'candidate' memories with zero reinforcement older than this are pruned to 'deprecated' */
const CANDIDATE_NO_REINFORCEMENT_MAX_AGE_DAYS = 3;

/** Minimum reinforcement score to be considered "reinforced" for candidate pruning */
const CANDIDATE_REINFORCEMENT_THRESHOLD = 0.01;

/**
 * Connectivity threshold for hub memory detection.
 * Memories with more than this many links are considered highly connected.
 */
const HUB_CONNECTIVITY_THRESHOLD = 5;

/**
 * Utility threshold for hub memories.
 * Highly connected memories must also have utility above this to be marked as hubs.
 */
const HUB_UTILITY_THRESHOLD = 0.6;

/**
 * Salience boost applied to hub memories.
 */
const HUB_SALIENCE_BOOST = 0.9;

/**
 * Overuse-but-low-utility detection: access_count must exceed this value
 * while utility is still below LOW_UTILITY_THRESHOLD.
 */
const OVER_ACCESSED_MIN_ACCESS_COUNT = 20;
const LOW_UTILITY_THRESHOLD = 0.3;
const OVER_ACCESSED_SALIENCE_PENALTY = 0.1;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface PruningStats {
  /** Memories hard-deleted (deprecated older than 30 days) */
  hardDeleted: number;
  /** Candidate memories demoted to deprecated (zero reinforcement, older than 3 days) */
  candidatesPruned: number;
  /** Memories whose stability was recomputed */
  stabilityRecomputed: number;
  /** Hub memories identified and boosted */
  hubsMarked: number;
  /** Over-accessed low-utility memories downgraded */
  overAccessedDowngraded: number;
  /** Decay results applied */
  decayApplied: number;
}

// ---------------------------------------------------------------------------
// PruningService
// ---------------------------------------------------------------------------

export interface PruningServiceDeps {
  memoryClient: MemoryClient;
  logger: Logger;
}

/**
 * Runs the full nightly pruning and maintenance pass over a set of memory nodes.
 *
 * Operations performed in order:
 * 1. Apply time-based decay via DecayService
 * 2. Hard-delete 'deprecated' memories older than 30 days
 * 3. Prune 'candidate' memories older than 3 days with zero reinforcement → 'deprecated'
 * 4. Recompute stability scores for all non-deprecated memories
 * 5. Identify hub memories (high connectivity + high utility) → boost salience
 * 6. Downgrade over-accessed but low-utility memories → reduce salience
 */
export class PruningService {
  private readonly memoryClient: MemoryClient;
  private readonly logger: Logger;
  private readonly decayService: DecayService;

  constructor({ memoryClient, logger }: PruningServiceDeps) {
    this.memoryClient = memoryClient;
    this.logger = logger;
    this.decayService = new DecayService({ logger });
  }

  /**
   * Run the full pruning and maintenance pass over the given memories.
   *
   * @param memories - All memories for a space/user to process.
   * @param now - Reference time for all age and decay calculations. Defaults to new Date().
   * @returns PruningStats summarising all operations performed.
   */
  async run(memories: MemoryNode[], now: Date = new Date()): Promise<PruningStats> {
    const stats: PruningStats = {
      hardDeleted: 0,
      candidatesPruned: 0,
      stabilityRecomputed: 0,
      hubsMarked: 0,
      overAccessedDowngraded: 0,
      decayApplied: 0,
    };

    if (memories.length === 0) {
      return stats;
    }

    this.logger.info(`PruningService: processing ${memories.length} memories`);

    // Step 1: Apply decay to all non-deprecated memories
    const nonDeprecated = memories.filter((m) => m.status !== 'deprecated');
    const decayResults = this.decayService.applyDecay(nonDeprecated, now);
    stats.decayApplied = decayResults.length;

    // Persist decay updates
    for (const result of decayResults) {
      const updates: Partial<{ utility: number; confidence: number }> = {};
      if (result.utility !== undefined) updates.utility = result.utility;
      if (result.confidence !== undefined) updates.confidence = result.confidence;

      if (Object.keys(updates).length > 0) {
        try {
          await this.memoryClient.update({ id: result.memory_id, ...updates });
        } catch (err) {
          this.logger.warn(
            `PruningService: failed to persist decay for ${result.memory_id} — ${
              (err as Error).message
            }`
          );
        }
      }
    }

    // Step 2: Hard-delete deprecated memories older than 30 days
    const deprecated = memories.filter((m) => m.status === 'deprecated');
    for (const mem of deprecated) {
      const ageDays = computeAgeDays(mem.updated_at, now);
      if (ageDays >= DEPRECATED_HARD_DELETE_DAYS) {
        try {
          await this.memoryClient.delete(mem.id);
          stats.hardDeleted++;
          this.logger.debug(
            `PruningService: hard-deleted deprecated memory ${mem.id} (age=${ageDays.toFixed(1)} days)`
          );
        } catch (err) {
          this.logger.warn(
            `PruningService: failed to delete ${mem.id} — ${(err as Error).message}`
          );
        }
      }
    }

    // Step 3: Prune candidates with zero reinforcement older than 3 days
    const candidates = memories.filter((m) => m.status === 'candidate');
    for (const mem of candidates) {
      const ageDays = computeAgeDays(mem.created_at, now);
      const reinforcement = mem.reinforcement_score ?? 0;

      if (
        ageDays > CANDIDATE_NO_REINFORCEMENT_MAX_AGE_DAYS &&
        reinforcement < CANDIDATE_REINFORCEMENT_THRESHOLD
      ) {
        try {
          await this.memoryClient.update({ id: mem.id, status: 'deprecated' });
          stats.candidatesPruned++;
          this.logger.debug(
            `PruningService: pruned candidate ${mem.id} to deprecated (age=${ageDays.toFixed(1)} days, reinforcement=${reinforcement.toFixed(3)})`
          );
        } catch (err) {
          this.logger.warn(
            `PruningService: failed to prune candidate ${mem.id} — ${(err as Error).message}`
          );
        }
      }
    }

    // Step 4: Recompute stability for all non-deprecated, non-candidate memories
    const activeMemories = memories.filter(
      (m) => m.status !== 'deprecated' && m.status !== 'candidate'
    );

    for (const mem of activeMemories) {
      const newStability = computeStability(mem, now);
      const currentStability = mem.stability ?? 0.1;

      if (Math.abs(newStability - currentStability) > 0.001) {
        try {
          await this.memoryClient.update({ id: mem.id, stability: newStability });
          stats.stabilityRecomputed++;
        } catch (err) {
          this.logger.warn(
            `PruningService: failed to update stability for ${mem.id} — ${(err as Error).message}`
          );
        }
      }
    }

    // Step 5: Identify and boost hub memories
    for (const mem of activeMemories) {
      const connectivity = mem.links.length;
      const utility = mem.utility ?? 0;
      const isHub = connectivity >= HUB_CONNECTIVITY_THRESHOLD && utility >= HUB_UTILITY_THRESHOLD;

      if (isHub) {
        const currentSalience = mem.salience ?? 0.5;
        if (currentSalience < HUB_SALIENCE_BOOST) {
          try {
            await this.memoryClient.update({ id: mem.id, salience: HUB_SALIENCE_BOOST });
            stats.hubsMarked++;
            this.logger.debug(
              `PruningService: marked hub memory ${mem.id} (links=${connectivity}, utility=${utility.toFixed(2)}, salience → ${HUB_SALIENCE_BOOST})`
            );
          } catch (err) {
            this.logger.warn(
              `PruningService: failed to boost hub salience for ${mem.id} — ${(err as Error).message}`
            );
          }
        }
      }
    }

    // Step 6: Downgrade over-accessed low-utility memories
    for (const mem of activeMemories) {
      const accessCount = mem.access_count ?? 0;
      const utility = mem.utility ?? 0;

      if (accessCount >= OVER_ACCESSED_MIN_ACCESS_COUNT && utility < LOW_UTILITY_THRESHOLD) {
        const currentSalience = mem.salience ?? 0.5;
        const newSalience = Math.max(0, currentSalience - OVER_ACCESSED_SALIENCE_PENALTY);

        if (newSalience < currentSalience) {
          try {
            await this.memoryClient.update({ id: mem.id, salience: newSalience });
            stats.overAccessedDowngraded++;
            this.logger.debug(
              `PruningService: downgraded over-accessed low-utility memory ${mem.id} (access=${accessCount}, utility=${utility.toFixed(2)}, salience ${currentSalience.toFixed(2)} → ${newSalience.toFixed(2)})`
            );
          } catch (err) {
            this.logger.warn(
              `PruningService: failed to downgrade salience for ${mem.id} — ${(err as Error).message}`
            );
          }
        }
      }
    }

    this.logger.info(
      `PruningService: complete — hardDeleted=${stats.hardDeleted}, candidatesPruned=${stats.candidatesPruned}, stabilityRecomputed=${stats.stabilityRecomputed}, hubsMarked=${stats.hubsMarked}, overAccessedDowngraded=${stats.overAccessedDowngraded}`
    );

    return stats;
  }
}

// ---------------------------------------------------------------------------
// Helpers (exported for testability)
// ---------------------------------------------------------------------------

/**
 * Compute the stability score for a memory node.
 *
 * Formula: stability = (age_days / 30) * (1 - decay_rate) * normalized_reinforcement
 *
 * Where:
 * - age_days / 30: normalized age (capped at 1.0 after 30 days)
 * - 1 - decay_rate: memory-type-specific persistence factor
 *   - episodic:   decay_rate = 0.1  → persistence = 0.9
 *   - semantic:   decay_rate = 0.03 → persistence = 0.97
 *   - procedural: decay_rate = 0.01 → persistence = 0.99
 * - normalized_reinforcement: reinforcement_score clamped to [0, 1]
 */
export const computeStability = (memory: MemoryNode, now: Date): number => {
  const createdMs = Date.parse(memory.created_at);
  const ageDays = isNaN(createdMs)
    ? 0
    : Math.max(0, (now.getTime() - createdMs) / (1000 * 60 * 60 * 24));

  const normalizedAge = Math.min(1.0, ageDays / 30);

  const decayRateByType: Record<string, number> = {
    episodic: 0.1,
    semantic: 0.03,
    procedural: 0.01,
  };
  const decayRate = decayRateByType[memory.type] ?? 0.03;
  const persistence = 1 - decayRate;

  const normalizedReinforcement = Math.min(1.0, Math.max(0, memory.reinforcement_score ?? 0));

  const stability = normalizedAge * persistence * normalizedReinforcement;
  return Math.min(1.0, Math.max(0, stability));
};

/**
 * Compute the age in days from a given ISO timestamp to the reference time.
 */
const computeAgeDays = (isoTimestamp: string, now: Date): number => {
  const ts = Date.parse(isoTimestamp);
  if (isNaN(ts)) return 0;
  return Math.max(0, (now.getTime() - ts) / (1000 * 60 * 60 * 24));
};
