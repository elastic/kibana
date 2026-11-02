/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Media kinds the multimodal embedding endpoint accepts; SVG is rejected by the model. */
export const SESSION_MEMORY_MEDIA_TYPES = ['image', 'pdf'] as const;
export type SessionMemoryMediaType = (typeof SESSION_MEMORY_MEDIA_TYPES)[number];

/** `base64` (default): `value` is a `data:` URL. `url`: `value` is an `https` URL fetched by the inference service. */
export const SESSION_MEMORY_MEDIA_FORMATS = ['base64', 'url'] as const;
export type SessionMemoryMediaFormat = (typeof SESSION_MEMORY_MEDIA_FORMATS)[number];

export interface SessionMemoryMediaItem {
  type: SessionMemoryMediaType;
  value: string;
  format?: SessionMemoryMediaFormat;
}

/** Body of `POST /_context_engine/session_memory/_remember`. `@timestamp` is never sent; ES assigns it. */
export interface RememberSessionMemoryBody {
  session_id: string;
  user_id: string;
  agent_id: string;
  space?: string;
  ai_index_id?: string[];
  type?: string;
  content?: string;
  media?: SessionMemoryMediaItem[];
  attributes?: Record<string, unknown>;
}

/** A stored session memory, as ES returns it. */
export interface SessionMemory extends RememberSessionMemoryBody {
  id: string;
  '@timestamp': string;
}

export type RememberSessionMemoryResponse = SessionMemory;

/** Query of `GET /_context_engine/session_memory/{session_id}` and `GET /_context_engine/session_events/{session_id}`. */
export interface SessionScopeQuery {
  space?: string;
  ai_index_id?: string;
  size?: number;
}

export interface ListSessionMemoryResponse {
  count: number;
  /** Newest first. */
  results: SessionMemory[];
}

/** Text, or a media item in the same shape as a stored `media` entry. */
export type SessionMemorySearchQuery = string | SessionMemoryMediaItem;

/** Body of `POST /_context_engine/session_memory/_search`. Filters narrow the candidates before the vector search. */
export interface SearchSessionMemoryBody {
  query: SessionMemorySearchQuery;
  session_id?: string;
  user_id?: string;
  agent_id?: string;
  space?: string;
  ai_index_id?: string;
  size?: number;
}

export interface SessionMemorySearchHit {
  _score: number;
  memory: SessionMemory;
}

export interface SearchSessionMemoryResponse {
  count: number;
  results: SessionMemorySearchHit[];
}

/** Body of `POST /_context_engine/session_events/_save`. Events hold raw transcripts only; no inference runs on them. */
export interface SaveSessionEventBody {
  session_id: string;
  user_id: string;
  agent_id: string;
  round_id?: string;
  space?: string;
  ai_index_id?: string[];
  transcript: string;
}

export interface SessionEvent extends SaveSessionEventBody {
  id: string;
  '@timestamp': string;
}

export type SaveSessionEventResponse = SessionEvent;

export interface ListSessionEventsResponse {
  count: number;
  /** Newest first. */
  results: SessionEvent[];
}
