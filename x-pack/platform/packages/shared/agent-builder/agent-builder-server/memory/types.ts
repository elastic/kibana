/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ShortTermMemory,
  ShortTermMemoryPromotion,
  ShortTermMemoryPromotionStatus,
  ShortTermMemoryType,
} from '@kbn/agent-builder-common';

/** The content a writer supplies. Identity, session and timestamps are stamped by the server. */
export interface ShortTermMemoryContent {
  type: ShortTermMemoryType;
  title: string;
  description: string;
  content: string;
  tags?: string[];
  /** ISO 8601. `null` makes the memory non-expiring; omitted uses the default TTL. */
  expires_at?: string | null;
}

export interface ShortTermMemoryCreateParams extends ShortTermMemoryContent {
  agentId: string;
  sessionId: string;
}

export interface ShortTermMemoryListParams {
  /** Only this agent's memories. Omit for all of the user's memories in the space. */
  agentId?: string;
  limit?: number;
  includeExpired?: boolean;
}

export interface ShortTermMemorySearchParams {
  query: string;
  agentId?: string;
  limit?: number;
}

/**
 * Short-term memory of the user making the request, in the request's space. Every read and write
 * is limited to that user's own memories.
 */
export interface ScopedShortTermMemoryClient {
  /** Stable user id every memory written through this client is owned by. */
  readonly userId: string;
  create(params: ShortTermMemoryCreateParams): Promise<ShortTermMemory>;
  /** Replaces the given fields of an owned memory. Throws when it does not exist or is not owned. */
  update(id: string, changes: Partial<ShortTermMemoryContent>): Promise<ShortTermMemory>;
  /** Throws when the memory does not exist or is not owned by the caller. */
  get(id: string): Promise<ShortTermMemory>;
  list(params?: ShortTermMemoryListParams): Promise<ShortTermMemory[]>;
  search(params: ShortTermMemorySearchParams): Promise<ShortTermMemory[]>;
  /** Hard-deletes an owned memory. Throws when it does not exist or is not owned. */
  delete(id: string): Promise<void>;
  /** Hard-deletes all of the caller's memories in the space, optionally for one agent only. */
  deleteAll(params?: { agentId?: string }): Promise<{ deleted: number }>;
  /**
   * Records that these memories were recalled or shown to the agent, which keeps them from
   * decaying. Memories recorded within the last hour are skipped, and nothing else changes.
   */
  markUsed(memories: ShortTermMemory[]): Promise<void>;
}

export interface ShortTermMemoryPromotionListParams {
  spaceId: string;
  /** Only memories recorded by these agents. Omit for every agent. */
  agentIds?: string[];
  statuses?: ShortTermMemoryPromotionStatus[];
  /** Only memories last written at or after this ISO 8601 time. */
  since?: string;
  limit?: number;
}

export interface ShortTermMemoryOwnerListParams {
  spaceId: string;
  /** Only memories recorded by these agents. Omit for every agent. */
  agentIds?: string[];
  /** Only owners with a memory written in the last N hours. Omit for every owner. */
  changedWithinHours?: number;
  maxOwners?: number;
  /** Newest first, per owner. */
  maxMemoriesPerOwner?: number;
}

/** The unexpired memories one user has with one agent. */
export interface ShortTermMemoryOwnerGroup {
  user_id: string;
  user_name: string;
  agent_id: string;
  memories: ShortTermMemory[];
}

/** Several memories of one owner rewritten as one: `keep_id` takes the content, the rest go. */
export interface ShortTermMemoryMerge {
  keep_id: string;
  source_ids: string[];
  title: string;
  description: string;
  content: string;
  tags?: string[];
}

export interface ShortTermMemoryConsolidateParams {
  spaceId: string;
  userId: string;
  agentId: string;
  merges: ShortTermMemoryMerge[];
  /** Memories to delete outright, such as ones a newer memory contradicts. */
  remove: Array<{ id: string; reason?: string }>;
  /** Recorded as the memories' last writer, such as `workflow://<id>`. */
  writer: { uri: string; metadata: Record<string, string> };
}

export interface ShortTermMemoryConsolidateResult {
  merged: number;
  deleted: number;
  /** Merges dropped because a memory was missing, not this owner's, or revised meanwhile. */
  skipped: number;
}

export interface ShortTermMemoryDecayParams {
  spaceId: string;
  agentIds?: string[];
  /** Memories neither written nor used for this many days are deleted. */
  unusedDays: number;
}

export interface ShortTermMemoryDecayResult {
  /** Memories past their `expires_at`. */
  expired: number;
  /** Memories neither written nor used within `unusedDays`. Non-expiring memories are kept. */
  unused: number;
}

/**
 * Cross-user access for the memory automations. It reads and changes every user's memories, so
 * callers must authorize the request before using it.
 */
export interface ShortTermMemorySystemClient {
  listForPromotion(params: ShortTermMemoryPromotionListParams): Promise<ShortTermMemory[]>;
  setPromotion(params: {
    spaceId: string;
    ids: string[];
    promotion: Omit<ShortTermMemoryPromotion, 'updated_at'>;
  }): Promise<{ updated: number }>;
  listByOwner(params: ShortTermMemoryOwnerListParams): Promise<ShortTermMemoryOwnerGroup[]>;
  /** Applies merges and removals within one owner's memories. Never touches another owner's. */
  consolidate(params: ShortTermMemoryConsolidateParams): Promise<ShortTermMemoryConsolidateResult>;
  /** Hard-deletes expired memories and memories unused for `unusedDays`. */
  decay(params: ShortTermMemoryDecayParams): Promise<ShortTermMemoryDecayResult>;
}

/** Start contract of the Agent Builder short-term memory service. */
export interface MemoryStart {
  /** Throws `ShortTermMemoryIdentityError` when the caller has no stable user id. */
  getScopedClient(params: { request: KibanaRequest }): Promise<ScopedShortTermMemoryClient>;
  getSystemClient(): ShortTermMemorySystemClient;
}
