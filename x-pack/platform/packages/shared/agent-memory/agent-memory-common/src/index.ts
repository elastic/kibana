/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENT_MEMORY_PLUGIN_ID = 'agentMemory' as const;

/** Index name for the agent memory belief store. Non-hidden, ES|QL-queryable. */
export const AGENT_MEMORY_INDEX = 'ai-index-idx-agent-memory' as const;

/** Hidden data stream name for the audit trail. */
export const AGENT_MEMORY_HISTORY_STREAM = '.agent-memory-history' as const;

/** Memory type dimension (PDF / D2). */
export type MemoryType = 'episodic' | 'semantic' | 'procedural';

/** Memory category dimension (#15403, G2). */
export type MemoryCategory = 'profile' | 'preferences' | 'entities' | 'events' | 'trajectories';

export type AuthorKind = 'profile_uid' | 'username';
export type CallSource = 'agent' | 'user' | 'mcp' | 'unknown';
export type MemoryScopeKind = 'user' | 'agent' | 'space';

/** Visibility metadata for a memory. Optional fields preserve legacy document compatibility. */
export interface MemoryScope {
  readonly scope_kind?: MemoryScopeKind;
  readonly scope_id?: string;
}

/** Lifecycle metadata nested under the memory payload. */
export interface MemoryLifecycle {
  readonly valid_at?: string;
  readonly invalid_at?: string;
  readonly expired_at?: string;
  readonly superseded_by?: string;
  readonly suppress_until?: string;
  readonly use_count?: number;
  readonly last_used_at?: string;
}

/** Origin and lineage metadata for a memory. */
export interface MemoryProvenance {
  readonly author: string;
  readonly author_kind: AuthorKind;
  readonly call_source?: CallSource;
  readonly conversation_ids?: string[];
  readonly trace_ids?: string[];
  readonly source_memory_ids?: string[];
}

/** Agent Memory-specific payload nested beneath the generic root envelope. */
export interface MemoryPayload extends MemoryScope, MemoryLifecycle {
  readonly type?: MemoryType;
  readonly category?: MemoryCategory;
  readonly revision: number;
  readonly content_hash: string;
  readonly entities?: string[];
  readonly origin?: string;
  readonly assurance?: string;
  readonly provenance: MemoryProvenance;
  readonly diff_id?: string;
  readonly derived_from?: string[];
  readonly prior_document?: MemoryDocumentSnapshot;
}

/** Generic root fields used by the Agent Memory KI-shaped document contract. */
export interface MemoryDocumentEnvelope {
  readonly id: string;
  readonly type: 'memory';
  readonly title: string;
  readonly description: string;
  readonly content: string;
  readonly tags?: string[];
  readonly deleted?: boolean;
  readonly expires_at?: string;
  /** Time of the latest revision; optional while reading legacy records. */
  readonly '@timestamp'?: string;
  /** Stable time at which the memory was first learned. */
  readonly created_at: string;
  readonly space_id: string;
}

/** Memory payload captured in a prior-document snapshot, without nested history. */
export type MemoryPayloadSnapshot = Omit<MemoryPayload, 'prior_document'> & {
  readonly prior_document?: never;
};

/** One-level snapshot of a previous memory revision. */
export interface MemoryDocumentSnapshot extends MemoryDocumentEnvelope {
  readonly _id?: string;
  readonly memory: MemoryPayloadSnapshot;
}

/** Complete stored Agent Memory document. */
export interface MemoryDocument extends MemoryDocumentEnvelope {
  readonly _id?: string;
  readonly memory: MemoryPayload;
}
