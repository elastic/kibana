/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shared types and constants for the Agent Memory plugin.
// Phase 1: intentionally minimal — full contract surface expands in Phase 2.

export const AGENT_MEMORY_PLUGIN_ID = 'agentMemory' as const;

/** Index name for the agent memory belief store. Non-hidden, ES|QL-queryable. */
export const AGENT_MEMORY_INDEX = 'agent-memory' as const;

/** Hidden data stream name for the audit trail. */
export const AGENT_MEMORY_HISTORY_STREAM = '.agent-memory-history' as const;

/** Memory type dimension (PDF / D2). */
export type MemoryType = 'episodic' | 'semantic' | 'procedural';

/** Memory category dimension (#15403, G2). */
export type MemoryCategory = 'profile' | 'preferences' | 'entities' | 'events' | 'trajectories';
