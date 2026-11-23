/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RECALL_SOURCES = ['session_events', 'session_memory', 'ai_index'] as const;
export type RecallSource = (typeof RECALL_SOURCES)[number];

export type RecallFormat = 'json' | 'yaml';

export interface RecallRequest {
  query: string;
  user_id: string;
  session_ids?: string[];
  /** `session_events`, `session_memory`, `ai_index:<id>` or `ai_index:*`. */
  include: string[];
  token_budget: number;
  format: RecallFormat;
}

export interface RecallResult {
  id: string;
  /** Present on session events and session memories. */
  session_id?: string;
  /** `session_events`, `session_memory`, or `ai_index:<id>`. */
  source: string;
  date?: string;
  role?: 'user' | 'assistant';
  /** Markdown. */
  content: string;
  attributes?: Record<string, unknown>;
}

export interface RecallJsonResponse {
  results: RecallResult[];
  took_ms: number;
}

/** `context` holds the results as a YAML string. */
export interface RecallYamlResponse {
  context: string;
  took_ms: number;
}

export type RecallResponse = RecallJsonResponse | RecallYamlResponse;
