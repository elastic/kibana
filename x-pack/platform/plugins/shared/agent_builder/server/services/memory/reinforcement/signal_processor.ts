/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryNode, MemoryStatus, MemoryType, MemoryUpdateRequest } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';
import type { ReinforcementSignal } from '../active_memory_set';

// ---------------------------------------------------------------------------
// Type-specific reinforcement rates (positive signals)
// ---------------------------------------------------------------------------

const REINFORCEMENT_RATES_BY_TYPE: Record<MemoryType, number> = {
  episodic: 0.15, // fast impact, fast decay
  semantic: 0.10, // moderate
  procedural: 0.05, // slow, requires repeated signals
};

// ---------------------------------------------------------------------------
// Status promotion thresholds
// ---------------------------------------------------------------------------

/** candidate → provisional */
const CANDIDATE_TO_PROVISIONAL_THRESHOLD = 0.3;

/** provisional → established */
const PROVISIONAL_TO_ESTABLISHED_THRESHOLD = 0.6;

/** established → consolidated (all conditions must be met) */
const ESTABLISHED_TO_CONSOLIDATED_REINFORCEMENT = 0.7;
const ESTABLISHED_TO_CONSOLIDATED_STABILITY = 0.8;
const ESTABLISHED_TO_CONSOLIDATED_AGE_DAYS = 7;

// ---------------------------------------------------------------------------
// Effect constants
// ---------------------------------------------------------------------------

/** Utility increase for 'useful' signals */
const UTILITY_USEFUL_INCREMENT = 0.05;

/** Confidence penalty for 'misleading' signals */
const CONFIDENCE_MISLEADING_PENALTY = 0.1;

/** Confidence penalty for 'incorrect' signals */
const CONFIDENCE_INCORRECT_PENALTY = 0.15;

// ---------------------------------------------------------------------------
// Deps
// ---------------------------------------------------------------------------

export interface SignalProcessorDeps {
  memoryClient: MemoryClient;
  logger: Logger;
}

// ---------------------------------------------------------------------------
// SignalProcessor
// ---------------------------------------------------------------------------

/**
 * Processes advisory reinforcement signals from the ActiveMemorySet.
 *
 * Applies the following effects by signal kind:
 *
 * Positive effects:
 *   - useful: utility += 0.05, reinforcement_score += type_rate, promote if threshold met
 *
 * Negative effects:
 *   - misleading: confidence -= 0.1, status → 'suspect'
 *   - incorrect: confidence -= 0.15, status → 'suspect'
 *   - outdated: status → 'suspect'
 *   - duplicate/needs_update: tag for review (no global mutation, logged)
 *   - unused/irrelevant: local policy only (no global score change, skipped here)
 *
 * After applying effects, status promotion is evaluated.
 */
export class SignalProcessor {
  private readonly memoryClient: MemoryClient;
  private readonly logger: Logger;

  constructor({ memoryClient, logger }: SignalProcessorDeps) {
    this.memoryClient = memoryClient;
    this.logger = logger;
  }

  /**
   * Process all reinforcement signals in batch.
   *
   * Each signal is applied independently; failures for one signal do not
   * prevent processing of other signals.
   *
   * @param signals - Advisory reinforcement signals from ActiveMemorySet.getSignals()
   */
  async process(signals: ReinforcementSignal[]): Promise<void> {
    if (signals.length === 0) {
      return;
    }

    this.logger.debug(`SignalProcessor: processing ${signals.length} reinforcement signals`);

    // Group signals by memory_id to apply all signals to the same memory in one fetch
    const byMemoryId = new Map<string, ReinforcementSignal[]>();
    for (const signal of signals) {
      const existing = byMemoryId.get(signal.memory_id) ?? [];
      existing.push(signal);
      byMemoryId.set(signal.memory_id, existing);
    }

    for (const [memoryId, memorySignals] of byMemoryId) {
      try {
        await this.applySignalsToMemory(memoryId, memorySignals);
      } catch (err) {
        this.logger.warn(
          `SignalProcessor: failed to process signals for memory ${memoryId} — ${(err as Error).message}`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async applySignalsToMemory(
    memoryId: string,
    signals: ReinforcementSignal[]
  ): Promise<void> {
    let memory: MemoryNode;
    try {
      memory = await this.memoryClient.get(memoryId);
    } catch (err) {
      this.logger.debug(
        `SignalProcessor: memory ${memoryId} not found, skipping signals — ${(err as Error).message}`
      );
      return;
    }

    const update: MemoryUpdateRequest = {
      id: memoryId,
      last_reinforced_at: new Date().toISOString(),
    };

    let reinforcementDelta = 0;
    let utilityDelta = 0;
    let confidenceDelta = 0;
    let forceStatus: MemoryStatus | undefined;

    for (const signal of signals) {
      if (signal.effect === 'positive') {
        switch (signal.kind) {
          case 'useful': {
            const rate = REINFORCEMENT_RATES_BY_TYPE[memory.type] ?? REINFORCEMENT_RATES_BY_TYPE.semantic;
            reinforcementDelta += rate;
            utilityDelta += UTILITY_USEFUL_INCREMENT;
            this.logger.debug(
              `SignalProcessor: useful signal on ${memoryId} (type=${memory.type}, rate=${rate})`
            );
            break;
          }
          default:
            // Other positive kinds not defined — skip
            break;
        }
      } else {
        // negative effects
        switch (signal.kind) {
          case 'misleading':
            confidenceDelta -= CONFIDENCE_MISLEADING_PENALTY;
            forceStatus = 'suspect';
            this.logger.debug(`SignalProcessor: misleading signal on ${memoryId} — marking suspect`);
            break;

          case 'incorrect':
            confidenceDelta -= CONFIDENCE_INCORRECT_PENALTY;
            forceStatus = 'suspect';
            this.logger.debug(`SignalProcessor: incorrect signal on ${memoryId} — marking suspect`);
            break;

          case 'outdated':
            forceStatus = 'suspect';
            this.logger.debug(`SignalProcessor: outdated signal on ${memoryId} — marking suspect`);
            break;

          case 'duplicate':
            // Mark for review — no global score mutation, just log
            this.logger.info(
              `SignalProcessor: duplicate signal on ${memoryId} — flagged for merge review. Reason: ${signal.reason ?? 'none'}`
            );
            break;

          case 'needs_update':
            // Mark for revision — no global score mutation, just log
            this.logger.info(
              `SignalProcessor: needs_update signal on ${memoryId} — flagged for revision queue. Reason: ${signal.reason ?? 'none'}`
            );
            break;

          case 'unused':
          case 'irrelevant':
            // Local policy only — no global mutation
            break;

          default:
            break;
        }
      }
    }

    // Apply numeric deltas
    if (reinforcementDelta !== 0) {
      update.reinforcement_score = clamp(
        (memory.reinforcement_score ?? 0) + reinforcementDelta,
        0,
        2.0 // allow above 1.0 for strong accumulation
      );
    }

    if (utilityDelta !== 0) {
      update.utility = clamp((memory.utility ?? 0.5) + utilityDelta, 0, 1.0);
    }

    if (confidenceDelta !== 0) {
      update.confidence = clamp((memory.confidence ?? 0.5) + confidenceDelta, 0, 1.0);
    }

    if (forceStatus) {
      update.status = forceStatus;
    }

    // Evaluate status promotion (only if not being forced to suspect)
    if (!forceStatus) {
      const newReinforcementScore = update.reinforcement_score ?? memory.reinforcement_score ?? 0;
      const promotedStatus = this.evaluatePromotion(memory, newReinforcementScore);
      if (promotedStatus) {
        update.status = promotedStatus;
        this.logger.debug(
          `SignalProcessor: promoting ${memoryId} from ${memory.status} to ${promotedStatus}`
        );
      }
    }

    // Only update if there's something to change
    const hasChanges =
      update.reinforcement_score !== undefined ||
      update.utility !== undefined ||
      update.confidence !== undefined ||
      update.status !== undefined ||
      update.last_reinforced_at !== undefined;

    if (hasChanges) {
      await this.memoryClient.update(update);
    }
  }

  /**
   * Determine if the memory should be promoted to the next status tier.
   *
   * Returns the new status if promotion is warranted, or undefined if no change.
   */
  private evaluatePromotion(
    memory: MemoryNode,
    newReinforcementScore: number
  ): MemoryStatus | undefined {
    switch (memory.status) {
      case 'candidate':
        if (newReinforcementScore >= CANDIDATE_TO_PROVISIONAL_THRESHOLD) {
          return 'provisional';
        }
        break;

      case 'provisional':
        if (newReinforcementScore >= PROVISIONAL_TO_ESTABLISHED_THRESHOLD) {
          return 'established';
        }
        break;

      case 'established': {
        // All three conditions must be met for consolidation
        const stability = memory.stability ?? 0;
        const ageDays = this.computeAgeDays(memory.created_at);
        const reinforcement = newReinforcementScore;

        if (
          stability >= ESTABLISHED_TO_CONSOLIDATED_STABILITY &&
          ageDays >= ESTABLISHED_TO_CONSOLIDATED_AGE_DAYS &&
          reinforcement >= ESTABLISHED_TO_CONSOLIDATED_REINFORCEMENT
        ) {
          return 'consolidated';
        }
        break;
      }

      default:
        break;
    }

    return undefined;
  }

  /**
   * Compute the age of a memory in days from its created_at timestamp.
   */
  private computeAgeDays(createdAt: string): number {
    const created = Date.parse(createdAt);
    if (isNaN(created)) {
      return 0;
    }
    const diffMs = Date.now() - created;
    return diffMs / (1000 * 60 * 60 * 24);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
