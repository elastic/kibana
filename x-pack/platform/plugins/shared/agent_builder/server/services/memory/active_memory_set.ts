/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryNode } from '@kbn/agent-builder-common';

/**
 * A reinforcement signal enqueued for a memory node during a round.
 */
export interface ReinforcementSignal {
  memory_id: string;
  effect: 'positive' | 'negative';
  kind:
    | 'useful'
    | 'unused'
    | 'irrelevant'
    | 'misleading'
    | 'incorrect'
    | 'outdated'
    | 'duplicate'
    | 'needs_update';
  reason?: string;
}

/**
 * A memory node with its associated utility score, used in the final bundle.
 */
export interface MemoryBundleItem {
  id: string;
  summary: string;
  type: MemoryNode['type'];
  utility: number;
  used: boolean;
  reinforced: boolean;
}

/**
 * The final bundle compiled by checkpoint(final=true).
 */
export interface MemoryBundle {
  /** Memories injected and used by the agent this round, sorted by utility descending */
  used: MemoryBundleItem[];
  /** Memories retrieved but not used this round */
  unused: MemoryBundleItem[];
  /** Reinforcement signals enqueued this round */
  signals: ReinforcementSignal[];
  /** Total injected token count tracked across this round */
  injected_token_count: number;
}

/**
 * Tracks the per-round active memory state for a single agent execution.
 *
 * This class is NOT thread-safe — it is expected to be instantiated once per round
 * and used synchronously within that round.
 */
export class ActiveMemorySet {
  /** All memories retrieved from the memory index this round (by ID). */
  private readonly retrieved: Map<string, MemoryNode> = new Map();

  /** IDs of memories that the agent has explicitly marked as used. */
  private readonly used: Set<string> = new Set();

  /** Advisory reinforcement signals enqueued during this round. */
  private readonly reinforced: ReinforcementSignal[] = [];

  /** Candidate memories surfaced for potential injection (by ID). */
  private readonly candidates: Map<string, MemoryNode> = new Map();

  /** Cumulative token count of injected memories across all stages. */
  private injectedTokenCount: number = 0;

  /** Number of remember() calls made this round (capped at 10). */
  private rememberCallCount: number = 0;

  /** Total number of reinforce() items processed this round (capped at 40). */
  private reinforceItemCount: number = 0;

  /** Maximum remember() calls per round. */
  static readonly MAX_REMEMBER_CALLS = 10;

  /** Maximum reinforce() items per round. */
  static readonly MAX_REINFORCE_ITEMS_PER_ROUND = 40;

  /** Maximum reinforce() items per single call. */
  static readonly MAX_REINFORCE_ITEMS_PER_CALL = 20;

  // ---------------------------------------------------------------------------
  // Retrieval
  // ---------------------------------------------------------------------------

  /**
   * Add a retrieved memory to the active set.
   * No-op if the memory was already retrieved.
   */
  addRetrieved(memory: MemoryNode): void {
    this.retrieved.set(memory.id, memory);
  }

  /**
   * Add multiple retrieved memories at once.
   */
  addAllRetrieved(memories: MemoryNode[]): void {
    for (const memory of memories) {
      this.addRetrieved(memory);
    }
  }

  /**
   * Check whether a memory has already been retrieved this round.
   */
  hasRetrieved(memoryId: string): boolean {
    return this.retrieved.has(memoryId);
  }

  /**
   * Return all retrieved memories this round.
   */
  getAllRetrieved(): MemoryNode[] {
    return [...this.retrieved.values()];
  }

  /**
   * Return retrieved memories that are NOT yet in the active set.
   * Used by checkpoint(final=false) to surface newly retrieved memories to the agent.
   */
  getNewlyRetrieved(existingIds: Set<string>): MemoryNode[] {
    return [...this.retrieved.values()].filter((m) => !existingIds.has(m.id));
  }

  // ---------------------------------------------------------------------------
  // Usage tracking
  // ---------------------------------------------------------------------------

  /**
   * Mark a memory as used by the agent.
   * The memory must have been previously retrieved.
   */
  markUsed(memoryId: string): void {
    this.used.add(memoryId);
  }

  /**
   * Check whether a memory has been marked used.
   */
  isUsed(memoryId: string): boolean {
    return this.used.has(memoryId);
  }

  // ---------------------------------------------------------------------------
  // Candidate set
  // ---------------------------------------------------------------------------

  /**
   * Add a candidate memory (potentially relevant but not yet injected).
   */
  addCandidate(memory: MemoryNode): void {
    this.candidates.set(memory.id, memory);
  }

  /**
   * Return all candidate memories.
   */
  getAllCandidates(): MemoryNode[] {
    return [...this.candidates.values()];
  }

  // ---------------------------------------------------------------------------
  // Reinforcement signals
  // ---------------------------------------------------------------------------

  /**
   * Enqueue a reinforcement signal for a memory node.
   * Advisory only — signals are applied globally after the round ends.
   *
   * @throws Error if per-call cap (20) or per-round cap (40) is exceeded.
   */
  markReinforced(signal: ReinforcementSignal): void {
    this.reinforced.push(signal);
  }

  /**
   * Return all reinforcement signals enqueued this round.
   */
  getSignals(): ReinforcementSignal[] {
    return [...this.reinforced];
  }

  // ---------------------------------------------------------------------------
  // Call-rate tracking
  // ---------------------------------------------------------------------------

  /**
   * Record a remember() call. Returns true if the call is within the cap.
   */
  recordRememberCall(): boolean {
    if (this.rememberCallCount >= ActiveMemorySet.MAX_REMEMBER_CALLS) {
      return false;
    }
    this.rememberCallCount++;
    return true;
  }

  /**
   * Return the number of remember() calls made so far.
   */
  getRememberCallCount(): number {
    return this.rememberCallCount;
  }

  /**
   * Record reinforce() items. Returns how many were accepted (may be less than requested
   * if the round cap would be exceeded).
   */
  recordReinforceItems(count: number): number {
    const remaining = ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_ROUND - this.reinforceItemCount;
    const accepted = Math.min(count, remaining);
    this.reinforceItemCount += accepted;
    return accepted;
  }

  /**
   * Return the total reinforce items processed this round.
   */
  getReinforceItemCount(): number {
    return this.reinforceItemCount;
  }

  // ---------------------------------------------------------------------------
  // Token budget
  // ---------------------------------------------------------------------------

  /**
   * Estimate the token count for a memory node summary (rough approximation: 1 token ~ 4 chars).
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Add to the injected token count for a given stage.
   * @param tokens Number of tokens to add.
   */
  addInjectedTokens(tokens: number): void {
    this.injectedTokenCount += tokens;
  }

  /**
   * Return the total injected token count across all stages.
   */
  getInjectedTokenCount(): number {
    return this.injectedTokenCount;
  }

  // ---------------------------------------------------------------------------
  // Bundle
  // ---------------------------------------------------------------------------

  /**
   * Compile the final memory bundle for checkpoint(final=true).
   *
   * Returns used memories sorted by utility descending, followed by unused memories.
   */
  toBundle(): MemoryBundle {
    const usedItems: MemoryBundleItem[] = [];
    const unusedItems: MemoryBundleItem[] = [];

    for (const memory of this.retrieved.values()) {
      const isUsed = this.used.has(memory.id);
      const isReinforced = this.reinforced.some((s) => s.memory_id === memory.id);

      const item: MemoryBundleItem = {
        id: memory.id,
        summary: memory.summary,
        type: memory.type,
        utility: memory.utility,
        used: isUsed,
        reinforced: isReinforced,
      };

      if (isUsed) {
        usedItems.push(item);
      } else {
        unusedItems.push(item);
      }
    }

    // Sort used memories by utility descending
    usedItems.sort((a, b) => b.utility - a.utility);
    // Sort unused memories by utility descending as well
    unusedItems.sort((a, b) => b.utility - a.utility);

    return {
      used: usedItems,
      unused: unusedItems,
      signals: this.getSignals(),
      injected_token_count: this.injectedTokenCount,
    };
  }
}
