/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryNode, MemoryStatus } from '@kbn/agent-builder-common';

// ---------------------------------------------------------------------------
// Thresholds — mirrored from signal_processor.ts (single source of truth for
// the numeric thresholds; controller only evaluates, does not apply signals)
// ---------------------------------------------------------------------------

/** candidate → provisional */
const CANDIDATE_TO_PROVISIONAL_REINFORCEMENT = 0.3;
/** Maximum age for candidates with no reinforcement before pruning */
const CANDIDATE_MAX_AGE_DAYS_NO_REINFORCEMENT = 3;

/** provisional → established */
const PROVISIONAL_TO_ESTABLISHED_REINFORCEMENT = 0.6;

/** established → consolidated: all three must be met */
const ESTABLISHED_TO_CONSOLIDATED_STABILITY = 0.8;
const ESTABLISHED_TO_CONSOLIDATED_AGE_DAYS = 7;
const ESTABLISHED_TO_CONSOLIDATED_REINFORCEMENT = 0.7;

/** suspect → provisional: triggered when positive signals are present */
const SUSPECT_RECOVERY_REINFORCEMENT_THRESHOLD = 0.2;

/** deprecated soft-delete after this many days */
const DEPRECATED_SOFT_DELETE_DAYS = 30;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type TransitionAction =
  | 'promote'
  | 'prune'
  | 'decay'
  | 'flag_soft_delete'
  | 'no_change';

export interface TransitionResult {
  /** ID of the memory node evaluated */
  memory_id: string;

  /** Current status at time of evaluation */
  from_status: MemoryStatus;

  /** New status after transition (same as from_status when action is no_change or decay) */
  to_status: MemoryStatus;

  /** What action was taken */
  action: TransitionAction;

  /** Human-readable explanation for the transition */
  reason: string;

  /** Whether this memory should be soft-deleted */
  should_soft_delete?: boolean;
}

// ---------------------------------------------------------------------------
// StatusController
// ---------------------------------------------------------------------------

/**
 * Evaluates lifecycle state machine transitions for memory nodes.
 *
 * Complements SignalProcessor: while SignalProcessor applies the numeric
 * effects of reinforcement signals in real time, StatusController runs
 * periodically (nightly consolidation) to evaluate the full state machine
 * including pruning, aging, and recovery conditions.
 *
 * State machine:
 *   candidate    → provisional  (reinforcement_score >= 0.3)
 *   candidate    → [prune]      (age > 3 days with no reinforcement)
 *   provisional  → established  (reinforcement_score >= 0.6)
 *   provisional  → [decay]      (no action — gradual score decay by DecayService)
 *   established  → consolidated (stability >= 0.8 AND age > 7 days AND reinforcement >= 0.7)
 *   suspect      → provisional  (new positive signals: reinforcement_score >= 0.2)
 *   suspect      → deprecated   (no recovery signals)
 *   deprecated   → [soft-delete](age > 30 days since deprecation)
 */
export class StatusController {
  private readonly logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  /**
   * Evaluate lifecycle transitions for a batch of memory nodes.
   *
   * Returns TransitionResult for every memory, including no-change cases.
   * Callers are responsible for persisting status updates via MemoryClient.
   *
   * @param memories - Memory nodes to evaluate
   * @param now - Reference time for age calculations (injectable for tests)
   */
  evaluateTransitions(memories: MemoryNode[], now: Date = new Date()): TransitionResult[] {
    const results: TransitionResult[] = [];
    const nowMs = now.getTime();

    for (const memory of memories) {
      try {
        const result = this.evaluateSingle(memory, nowMs);
        results.push(result);

        if (result.action !== 'no_change') {
          this.logger.debug(
            `StatusController: ${memory.id} [${result.from_status} → ${result.to_status}] action=${result.action} reason="${result.reason}"`
          );
        }
      } catch (err) {
        this.logger.warn(
          `StatusController: failed to evaluate ${memory.id} — ${(err as Error).message}`
        );
      }
    }

    this.logger.debug(
      `StatusController: evaluated ${memories.length} memories, ${results.filter((r) => r.action !== 'no_change').length} transitions`
    );

    return results;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private evaluateSingle(memory: MemoryNode, nowMs: number): TransitionResult {
    const ageDays = this.computeAgeDays(memory.created_at, nowMs);
    const reinforcement = memory.reinforcement_score ?? 0;
    const stability = memory.stability ?? 0;

    switch (memory.status) {
      case 'candidate':
        return this.evaluateCandidate(memory, ageDays, reinforcement);

      case 'provisional':
        return this.evaluateProvisional(memory, reinforcement);

      case 'established':
        return this.evaluateEstablished(memory, ageDays, reinforcement, stability);

      case 'suspect':
        return this.evaluateSuspect(memory, ageDays, reinforcement, nowMs);

      case 'deprecated':
        return this.evaluateDeprecated(memory, nowMs);

      case 'consolidated':
        // Consolidated memories do not transition further upward
        return this.noChange(memory, 'consolidated — no further promotion');

      default:
        return this.noChange(memory, `unknown status: ${String(memory.status)}`);
    }
  }

  private evaluateCandidate(
    memory: MemoryNode,
    ageDays: number,
    reinforcement: number
  ): TransitionResult {
    // Promote to provisional if reinforcement threshold is met
    if (reinforcement >= CANDIDATE_TO_PROVISIONAL_REINFORCEMENT) {
      return {
        memory_id: memory.id,
        from_status: 'candidate',
        to_status: 'provisional',
        action: 'promote',
        reason: `reinforcement_score ${reinforcement.toFixed(3)} >= ${CANDIDATE_TO_PROVISIONAL_REINFORCEMENT}`,
      };
    }

    // Prune if too old with no reinforcement
    if (
      ageDays > CANDIDATE_MAX_AGE_DAYS_NO_REINFORCEMENT &&
      reinforcement < CANDIDATE_TO_PROVISIONAL_REINFORCEMENT
    ) {
      return {
        memory_id: memory.id,
        from_status: 'candidate',
        to_status: 'deprecated',
        action: 'prune',
        reason: `age ${ageDays.toFixed(1)} days > ${CANDIDATE_MAX_AGE_DAYS_NO_REINFORCEMENT} with reinforcement_score ${reinforcement.toFixed(3)} < ${CANDIDATE_TO_PROVISIONAL_REINFORCEMENT}`,
      };
    }

    return this.noChange(memory, `candidate waiting — age ${ageDays.toFixed(1)} days, reinforcement ${reinforcement.toFixed(3)}`);
  }

  private evaluateProvisional(memory: MemoryNode, reinforcement: number): TransitionResult {
    if (reinforcement >= PROVISIONAL_TO_ESTABLISHED_REINFORCEMENT) {
      return {
        memory_id: memory.id,
        from_status: 'provisional',
        to_status: 'established',
        action: 'promote',
        reason: `reinforcement_score ${reinforcement.toFixed(3)} >= ${PROVISIONAL_TO_ESTABLISHED_REINFORCEMENT}`,
      };
    }

    // No demotion from provisional — DecayService handles score decay
    return this.noChange(memory, `provisional — reinforcement ${reinforcement.toFixed(3)} < ${PROVISIONAL_TO_ESTABLISHED_REINFORCEMENT}`);
  }

  private evaluateEstablished(
    memory: MemoryNode,
    ageDays: number,
    reinforcement: number,
    stability: number
  ): TransitionResult {
    const stabilityMet = stability >= ESTABLISHED_TO_CONSOLIDATED_STABILITY;
    const ageMet = ageDays >= ESTABLISHED_TO_CONSOLIDATED_AGE_DAYS;
    const reinforcementMet = reinforcement >= ESTABLISHED_TO_CONSOLIDATED_REINFORCEMENT;

    if (stabilityMet && ageMet && reinforcementMet) {
      return {
        memory_id: memory.id,
        from_status: 'established',
        to_status: 'consolidated',
        action: 'promote',
        reason: `stability ${stability.toFixed(3)} >= ${ESTABLISHED_TO_CONSOLIDATED_STABILITY}, age ${ageDays.toFixed(1)} days >= ${ESTABLISHED_TO_CONSOLIDATED_AGE_DAYS}, reinforcement ${reinforcement.toFixed(3)} >= ${ESTABLISHED_TO_CONSOLIDATED_REINFORCEMENT}`,
      };
    }

    const missing: string[] = [];
    if (!stabilityMet) missing.push(`stability ${stability.toFixed(3)} < ${ESTABLISHED_TO_CONSOLIDATED_STABILITY}`);
    if (!ageMet) missing.push(`age ${ageDays.toFixed(1)} < ${ESTABLISHED_TO_CONSOLIDATED_AGE_DAYS} days`);
    if (!reinforcementMet) missing.push(`reinforcement ${reinforcement.toFixed(3)} < ${ESTABLISHED_TO_CONSOLIDATED_REINFORCEMENT}`);

    return this.noChange(memory, `established — missing: ${missing.join(', ')}`);
  }

  private evaluateSuspect(
    memory: MemoryNode,
    ageDays: number,
    reinforcement: number,
    nowMs: number
  ): TransitionResult {
    // Re-promote if positive signals have raised reinforcement
    if (reinforcement >= SUSPECT_RECOVERY_REINFORCEMENT_THRESHOLD) {
      return {
        memory_id: memory.id,
        from_status: 'suspect',
        to_status: 'provisional',
        action: 'promote',
        reason: `recovery — reinforcement_score ${reinforcement.toFixed(3)} >= ${SUSPECT_RECOVERY_REINFORCEMENT_THRESHOLD}`,
      };
    }

    // Deprecate if no recovery — use updated_at as proxy for "time in suspect"
    const updatedMs = Date.parse(memory.updated_at);
    const daysSinceUpdate = isNaN(updatedMs)
      ? ageDays
      : Math.max(0, (nowMs - updatedMs) / (1000 * 60 * 60 * 24));

    if (daysSinceUpdate >= CANDIDATE_MAX_AGE_DAYS_NO_REINFORCEMENT) {
      return {
        memory_id: memory.id,
        from_status: 'suspect',
        to_status: 'deprecated',
        action: 'prune',
        reason: `suspect with no recovery for ${daysSinceUpdate.toFixed(1)} days, reinforcement_score ${reinforcement.toFixed(3)}`,
      };
    }

    return this.noChange(
      memory,
      `suspect — waiting for recovery (${daysSinceUpdate.toFixed(1)} days, reinforcement ${reinforcement.toFixed(3)})`
    );
  }

  private evaluateDeprecated(memory: MemoryNode, nowMs: number): TransitionResult {
    // Flag for soft-delete after 30 days in deprecated state
    const updatedMs = Date.parse(memory.updated_at);
    const daysSinceDeprecation = isNaN(updatedMs)
      ? DEPRECATED_SOFT_DELETE_DAYS
      : Math.max(0, (nowMs - updatedMs) / (1000 * 60 * 60 * 24));

    if (daysSinceDeprecation >= DEPRECATED_SOFT_DELETE_DAYS) {
      return {
        memory_id: memory.id,
        from_status: 'deprecated',
        to_status: 'deprecated',
        action: 'flag_soft_delete',
        reason: `deprecated for ${daysSinceDeprecation.toFixed(1)} days >= ${DEPRECATED_SOFT_DELETE_DAYS} — flagged for soft-delete`,
        should_soft_delete: true,
      };
    }

    return this.noChange(
      memory,
      `deprecated — ${daysSinceDeprecation.toFixed(1)} of ${DEPRECATED_SOFT_DELETE_DAYS} days before soft-delete`
    );
  }

  private noChange(memory: MemoryNode, reason: string): TransitionResult {
    return {
      memory_id: memory.id,
      from_status: memory.status,
      to_status: memory.status,
      action: 'no_change',
      reason,
    };
  }

  private computeAgeDays(createdAt: string, nowMs: number): number {
    const created = Date.parse(createdAt);
    if (isNaN(created)) {
      return 0;
    }
    return Math.max(0, (nowMs - created) / (1000 * 60 * 60 * 24));
  }
}
