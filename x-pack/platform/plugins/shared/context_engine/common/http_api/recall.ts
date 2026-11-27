/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiJsonValue } from './knowledge_indicators';

export type RecallFormat = 'json';

export type RecallSessionStore = 'session_events' | 'session_memory';

export type RecallIncludeEntry = RecallSessionStore | `ai_index:${string}`;

export interface RecallRequest {
  query: string;
  user_id: string;
  include: RecallIncludeEntry[];
  session_ids?: string[];
  token_budget?: number;
  format?: RecallFormat;
}

export interface AiIndexRecallResult {
  id: string;
  source: `ai_index:${string}`;
  date?: string;
  content: string;
  attributes?: Record<string, KiJsonValue>;
}

export type RecallResult = AiIndexRecallResult;

export interface RecallJsonResponse {
  results: RecallResult[];
  took_ms: number;
}
