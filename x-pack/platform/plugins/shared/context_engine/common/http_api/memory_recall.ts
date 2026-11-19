/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RECALL_SOURCES = ['session_events', 'session_memory', 'ai_index'] as const;
export type RecallSource = (typeof RECALL_SOURCES)[number];

export type RecallFormat = 'json' | 'text';

export interface RecallInclude {
  session_events: boolean;
  session_memory: boolean;
  ai_index_ids: string[];
}

export interface RecallRequest {
  query: string;
  user_id?: string;
  session_ids?: string[];
  include: RecallInclude;
  max_tokens: number;
  format: RecallFormat;
}

export interface RecallResult {
  id: string;
  /** `session_events`, `session_memory`, or `ai_index:<id>`. */
  source: string;
  date?: string;
  content: string;
  role?: 'user' | 'assistant';
}

export interface RecallJsonResponse {
  results: RecallResult[];
  took_ms: number;
}

export interface RecallTextResponse {
  context: string;
  took_ms: number;
}

export type RecallResponse = RecallJsonResponse | RecallTextResponse;
