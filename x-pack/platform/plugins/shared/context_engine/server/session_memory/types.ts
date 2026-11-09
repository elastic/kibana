/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import type { sessionEventsMappings, sessionMemoryMappings } from './data_streams';

/** A session memory document as stored in Elasticsearch, one per revision. */
export interface StoredSessionMemory {
  '@timestamp': string;
  id: string;
  space: string;
  session_id: string;
  user_id: string;
  ai_index_id: string[];
  /** Absent on tombstones. */
  content?: string;
  attributes?: Record<string, string>;
  /** Present only on tombstones. */
  deleted_at?: string;
}

export type SessionMemoryClient = IDataStreamClient<
  typeof sessionMemoryMappings,
  StoredSessionMemory
>;

/** A session event document as stored in Elasticsearch, one per turn. */
export interface StoredSessionEvent {
  '@timestamp': string;
  id: string;
  space: string;
  session_id: string;
  turn_id?: string;
  user_id: string;
  ai_index_id: string[];
  transcript: string;
}

export type SessionEventsClient = IDataStreamClient<
  typeof sessionEventsMappings,
  StoredSessionEvent
>;

/** Every session memory operation runs for one user in one space. */
export interface SessionMemoryScope {
  space: string;
  userId: string;
}

/** The latest live revision of a memory. */
export interface SessionMemory {
  id: string;
  sessionId: string;
  userId: string;
  aiIndexIds: readonly string[];
  content: string;
  attributes: Readonly<Record<string, string>>;
  /** When this revision was written. */
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

export interface SaveEventInput {
  /** Defaults to a generated id. A caller that answers before the write finishes passes its own. */
  id?: string;
  sessionId: string;
  /** The harness's id for the turn, when it has one. */
  turnId?: string;
  transcript: string;
  aiIndexIds?: readonly string[];
}

export type ForgetOutcome = 'forgotten' | 'already_forgotten' | 'not_found';

export interface SessionMemoryService {
  /** Writes a new memory, or a revision of `input.id`, and returns the memory's id. */
  remember(scope: SessionMemoryScope, input: RememberInput): Promise<{ id: string }>;
  /** Returns the latest revision, or undefined when the memory is missing, forgotten, or out of scope. */
  get(scope: SessionMemoryScope, id: string): Promise<SessionMemory | undefined>;
  /** Tombstones each memory, keeping its revisions until retention removes them. */
  forget(scope: SessionMemoryScope, ids: readonly string[]): Promise<Record<string, ForgetOutcome>>;
  /** Deletes every revision of each memory, tombstones included, and counts the deleted documents. */
  hardDelete(
    scope: SessionMemoryScope,
    ids: readonly string[]
  ): Promise<{ deletedDocuments: number }>;
  /** Writes one turn's transcript and returns the event's id. */
  saveEvent(scope: SessionMemoryScope, input: SaveEventInput): Promise<{ id: string }>;
}
