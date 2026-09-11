/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SELF_AGENT_ID } from '@kbn/agent-builder-common';
import type { SubagentEntry, SubagentRosterEntry } from '@kbn/agent-builder-common';

/**
 * Creation event for a persistent sub-agent within a single round. Carries the
 * `purpose` (from the `description` param of `run_subagent`) alongside the
 * addressable identity — used to build the `<active_subagents>` roster notice.
 */
export interface SubagentCreation extends SubagentRosterEntry {
  /**
   * Agent id backing this child — real id or `SELF_AGENT_ID` sentinel,
   * stored as-is on the tracker entry.
   */
  agent_id: string;
}

/**
 * In-memory tracker for persistent sub-agents
 * - seeded from the parent conversation's `state.subagents` at round start
 * - new creations are added mid-round.
 *
 * Each entry carries the backing `agent_id` so `send_message` can filter by
 * the parent's `subagent_ids` allowlist. Legacy state entries (bare strings
 * from pre-persistent-mode data) are normalized to `SubagentEntry` with
 * `agent_id: SELF_AGENT_ID` at hydration time — every persistent sub-agent
 * created before the change was a self-fork.
 */
export class SubagentTracker {
  private readonly map: Record<string, SubagentEntry>;
  private readonly creations: SubagentCreation[] = [];

  constructor(initial: Record<string, SubagentEntry | string> = {}) {
    this.map = {};
    for (const [name, value] of Object.entries(initial)) {
      this.map[name] = normalizeEntry(value);
    }
  }

  /** Returns the entry for a given name, if present. */
  get(name: string): SubagentEntry | undefined {
    return this.map[name];
  }

  /** Register a new persistent sub-agent under the given name. */
  register(entry: SubagentCreation): void {
    this.map[entry.name] = {
      conversation_id: entry.conversation_id,
      agent_id: entry.agent_id,
    };
    this.creations.push(entry);
  }

  /** Drop an entry (e.g. stale-recovery overwrite before re-adding). */
  clear(name: string): void {
    delete this.map[name];
  }

  /** Full current snapshot of the roster (name → entry). */
  snapshot(): Record<string, SubagentEntry> {
    const out: Record<string, SubagentEntry> = {};
    for (const [name, entry] of Object.entries(this.map)) {
      out[name] = { ...entry };
    }
    return out;
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
    return Object.entries(this.map).map(([name, entry]) => ({
      name,
      conversation_id: entry.conversation_id,
      purpose: thisRoundPurposes[name] ?? priorPurposes[name],
    }));
  }
}

const normalizeEntry = (value: SubagentEntry | string): SubagentEntry => {
  if (typeof value === 'string') {
    // Legacy: pre-persistent-mode entries were all self-forks.
    return { conversation_id: value, agent_id: SELF_AGENT_ID };
  }
  return { ...value };
};
