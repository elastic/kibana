/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Legacy persisted metadata; new writes classify memories with MemoryCategory. */
export type MemoryType = 'episodic' | 'semantic' | 'procedural';
export type MemoryCategory = 'events' | 'trajectories' | 'procedures';
export type AuthorKind = 'profile_uid' | 'username';
export type CallSource = 'agent' | 'user' | 'mcp' | 'workflow' | 'unknown';
export type MemoryScopeKind = 'user' | 'space';

/** Creator metadata for display and audit; scope controls visibility and ownership. */
export interface MemoryProvenance {
  readonly author: string;
  readonly author_kind: AuthorKind;
  readonly call_source?: CallSource;
  /** IDs of recalled memories that informed this write (attribution-grade; model self-reports). */
  readonly used_memory_ids?: readonly string[];
}

export interface MemoryKibanaPrivilegeGroup {
  readonly space: string;
  readonly name: string[];
  readonly count: number;
}

export interface MemoryPermissions {
  readonly kibana: {
    readonly privileges: MemoryKibanaPrivilegeGroup[];
  };
}

export interface MemoryPayload {
  readonly type?: MemoryType;
  readonly category?: MemoryCategory;
  readonly revision: number;
  readonly content_hash: string;
  readonly scope_kind: MemoryScopeKind;
  readonly scope_id: string;
  readonly provenance: MemoryProvenance;
}

/** Generic AI-index envelope fields used by Agent Memory. */
export interface MemoryDocumentEnvelope {
  readonly id: string;
  readonly type: 'memory';
  readonly title: string;
  readonly description: string;
  readonly content: string;
  readonly tags?: string[];
  readonly deleted?: boolean;
  readonly expires_at?: string;
  readonly '@timestamp'?: string;
  readonly created_at: string;
  readonly space_id: string;
  readonly permissions: MemoryPermissions;
  /** Consumer namespace. Default 'agent_memory'. Prevents cross-consumer data collision. */
  readonly namespace: string;
}

export interface MemoryDocument extends MemoryDocumentEnvelope {
  readonly _id?: string;
  readonly memory: MemoryPayload;
}
