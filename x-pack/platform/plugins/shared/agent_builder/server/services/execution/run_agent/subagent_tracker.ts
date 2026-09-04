/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubagentRosterEntry } from '@kbn/agent-builder-common';

/**
 * In-memory tracker for persistent sub-agents
 * - seeded from the parent conversation's `state.subagents` at round start
 * - new creations are added mid-round.
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
   * Number of persistent sub-agents created in this round so far.
   */
  creationCount(): number {
    return this.creations.length;
  }

  /**
   * Return the current full roster with purposes.
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
