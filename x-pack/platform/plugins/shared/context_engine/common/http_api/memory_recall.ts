/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RECALL_SOURCES = ['session_events', 'session_memory', 'ai_index'] as const;
export type RecallSource = (typeof RECALL_SOURCES)[number];

export type RecallFormat = 'list' | 'text';

export interface RecallRequest {
  query: string;
  ai_index_ids?: string[];
  user_id?: string;
  session_ids?: string[];
  sources: RecallSource[];
  max_tokens: number;
  format: RecallFormat;
}

export interface RecallResult {
  id: string;
  source: RecallSource;
  /** True for a pinned memory returned in the reserved space. */
  reserved: boolean;
  date?: string;
  content: string;
  role?: 'user' | 'assistant';
  session_id?: string;
  ai_index_id?: string;
}

export interface RecallListResponse {
  results: RecallResult[];
  took_ms: number;
  tokens: number;
}

export interface RecallTextResponse {
  context: string;
  took_ms: number;
  tokens: number;
}

export type RecallResponse = RecallListResponse | RecallTextResponse;
