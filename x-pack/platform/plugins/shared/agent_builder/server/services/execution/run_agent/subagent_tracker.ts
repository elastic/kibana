/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubagentRosterEntry } from '@kbn/agent-builder-common';

/**
 * In-memory tracker for persistent sub-agents created / resolved during a
 * single round of the parent's execution. Seeded from the parent conversation's
 * `state.subagents` at round start; new creations are added mid-round. The
 * final snapshot is persisted back on the parent conversation via
 * `getConversationState()`.
 *
 * Purposes captured on creation live only in memory for the current round; on
 * replay they come from the most recent `SubagentRosterUpdatedStep` in the
 * conversation history (see `getPriorPurposes` in `graph.ts`).
 */
export class SubagentTracker {
  private readonly map: Record<string, string>;
  private readonly creations: SubagentRosterEntry[] = [];

  constructor(initial: Record<string, string> = {}) {
    this.map = { ...initial };
  }

  /** Returns the child conversation id for a given name, if present. */
  get(name: string): string | undefined {
    return this.map[name];
  }

  /** Register a new persistent sub-agent under the given name. */
  register(entry: SubagentRosterEntry): void {
    this.map[entry.name] = entry.conversation_id;
    this.creations.push(entry);
  }

  /** Drop an entry (e.g. stale-recovery overwrite before re-adding). */
  clear(name: string): void {
    delete this.map[name];
  }

  /** Full current snapshot of the roster (name → conversation_id). */
  snapshot(): Record<string, string> {
    return { ...this.map };
  }

  /**
   * Whether any persistent sub-agents were created in this round so far.
   */
  hasCreations(): boolean {
    return this.creations.length > 0;
  }

  /**
   * Return the current full roster with purposes.
   * - Purposes for entries created THIS round are taken from
   *   `creations` (recorded via `register`).
   * - Purposes for pre-existing entries fall back to `priorPurposes`
   *   (typically sourced from the most recent SubagentRosterUpdatedStep
   *   on the parent conversation).
   */
  activeRoster(priorPurposes: Record<string, string> = {}): SubagentRosterEntry[] {
    const thisRoundPurposes: Record<string, string | undefined> = {};
    for (const c of this.creations) {
      thisRoundPurposes[c.name] = c.purpose;
    }
    return Object.entries(this.map).map(([name, conversation_id]) => ({
      name,
      conversation_id,
      purpose: thisRoundPurposes[name] ?? priorPurposes[name],
    }));
  }
}
