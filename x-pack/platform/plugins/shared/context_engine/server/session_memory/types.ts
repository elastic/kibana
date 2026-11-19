/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** One revision of a memory. */
export interface StoredSessionMemory {
  '@timestamp': string;
  id: string;
  space: string;
  session_id: string;
  user_id: string;
  ai_index_id: readonly string[];
  /** Absent on tombstones. */
  content?: string;
  attributes?: Readonly<Record<string, string>>;
  /** Present only on tombstones. */
  deleted_at?: string;
}

export interface SessionMemoryScope {
  space: string;
  userId: string;
}

export interface SessionMemory {
  id: string;
  sessionId: string;
  userId: string;
  aiIndexIds: readonly string[];
  content: string;
  attributes: Readonly<Record<string, string>>;
  revisedAt: string;
}

export interface RememberInput {
  /** Revises the memory with this id. The revision replaces it in full, and the id is not checked. */
  id?: string;
  sessionId: string;
  content: string;
  aiIndexIds?: readonly string[];
  attributes?: Readonly<Record<string, string>>;
}

export type ForgetOutcome = 'forgotten' | 'already_forgotten' | 'not_found';

export interface SessionMemoryService {
  /** Writes a new memory, or a revision of `input.id`, and returns the memory's id. */
  remember(scope: SessionMemoryScope, input: RememberInput): Promise<{ id: string }>;
  /** Returns the latest revision, or undefined when the memory is missing, forgotten, or out of scope. */
  get(scope: SessionMemoryScope, id: string): Promise<SessionMemory | undefined>;
  /**
   * Tombstones each memory, keeping its revisions until retention removes them. Throws for more
   * than `MAX_SESSION_MEMORY_FORGET_IDS` unique ids.
   */
  forget(scope: SessionMemoryScope, ids: readonly string[]): Promise<Record<string, ForgetOutcome>>;
}
