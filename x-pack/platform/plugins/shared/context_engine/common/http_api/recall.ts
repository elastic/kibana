/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiJsonValue } from './knowledge_indicators';

export const RECALL_FORMATS = ['yaml', 'json'] as const;
export type RecallFormat = (typeof RECALL_FORMATS)[number];

export const RECALL_SESSION_STORES = ['session_events', 'session_memory'] as const;
export type RecallSessionStore = (typeof RECALL_SESSION_STORES)[number];

export type RecallEventRole = 'user' | 'assistant';

export type RecallIncludeEntry = RecallSessionStore | `ai_index:${string}`;

export interface RecallRequest {
  query: string;
  user_id: string;
  include: RecallIncludeEntry[];
  session_ids?: string[];
  token_budget?: number;
  format?: RecallFormat;
}

export interface SessionEventRecallResult {
  id: string;
  session_id: string;
  source: 'session_events';
  date: string;
  role: RecallEventRole;
  content: string;
}

export interface SessionMemoryRecallResult {
  id: string;
  session_id: string;
  source: 'session_memory';
  date: string;
  content: string;
  attributes?: Record<string, string>;
}

export interface AiIndexRecallResult {
  id: string;
  source: `ai_index:${string}`;
  date?: string;
  content: string;
  attributes?: Record<string, KiJsonValue>;
}

export type RecallResult =
  | SessionEventRecallResult
  | SessionMemoryRecallResult
  | AiIndexRecallResult;

export interface RecallJsonResponse {
  results: RecallResult[];
  took_ms: number;
}

export interface RecallYamlResponse {
  context: string;
  took_ms: number;
}

export type RecallResponse = RecallJsonResponse | RecallYamlResponse;
