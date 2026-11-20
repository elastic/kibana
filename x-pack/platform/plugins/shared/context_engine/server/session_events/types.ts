/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SessionEventBase {
  /** Unique within the session. */
  id: string;
  turn_id: string;
  /** ISO date at which the agent created the event. */
  event_at: string;
  seq?: number;
}

export interface UserSessionEvent extends SessionEventBase {
  type: 'user';
  content: string;
}

export interface AssistantToolCall {
  id: string;
  name: string;
  args?: string;
}

export interface AssistantSessionEvent extends SessionEventBase {
  type: 'assistant';
  content?: string;
  tool_calls?: readonly AssistantToolCall[];
}

export interface ReasoningSessionEvent extends SessionEventBase {
  type: 'reasoning';
  content?: string;
}

export interface ToolSessionEvent extends SessionEventBase {
  type: 'tool';
  tool_call_id: string;
  tool_name: string;
  result?: string;
  /** Null or missing when the outcome is unknown. */
  status?: 'successful' | 'failed' | null;
}

export interface MetaSessionEvent extends SessionEventBase {
  type: 'meta';
}

/** An event as the agent sent it. Extra harness-specific fields are kept only in `raw`. */
export type SessionEventInput =
  | UserSessionEvent
  | AssistantSessionEvent
  | ReasoningSessionEvent
  | ToolSessionEvent
  | MetaSessionEvent;

interface StoredSessionEventBase {
  '@timestamp': string;
  event_at: string;
  id: string;
  seq?: number;
  space: string;
  ai_index_id: readonly string[];
  session_id: string;
  turn_id: string;
  user_id: string;
  raw: SessionEventInput;
}

export type StoredSessionEventTypeFields =
  | { type: 'user'; content: string }
  | { type: 'assistant'; content?: string; tool_name?: readonly string[] }
  | { type: 'reasoning' }
  | { type: 'tool'; tool_name: string; status: 'successful' | 'failed' | 'unknown' }
  | { type: 'meta' };

/** One document in the session events data stream, mapped strictly by Elasticsearch. */
export type StoredSessionEvent = StoredSessionEventBase & StoredSessionEventTypeFields;

export interface SessionEventsScope {
  space: string;
  userId: string;
}

export interface SaveEventsInput {
  sessionId: string;
  aiIndexIds?: readonly string[];
  events: readonly SessionEventInput[];
}

export type SaveEventResult =
  | { id: string; status: 'created' }
  | { id: string; status: 'failed'; error: string };

export interface SessionEventsService {
  /**
   * Writes one document per event. A resent event is stored again, so readers drop duplicates by
   * session and event id. Results follow the order of `input.events`.
   */
  saveEvents(
    scope: SessionEventsScope,
    input: SaveEventsInput
  ): Promise<{ results: SaveEventResult[] }>;
}
