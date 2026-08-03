/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wire types for the "Patterns & improvements" API. Patterns are detected
 * failure modes; improvements are the fixes applied against them (1-to-many).
 * There is no "issue" concept — a pattern is the actionable unit.
 */

export type PatternStatus = 'open' | 'improving' | 'resolved';

export interface Pattern {
  pattern_key: string;
  type: string;
  sub_type?: string;
  ai_index_id: string;
  status: PatternStatus;
  /** One- or two-sentence description of the failure the classifier detected. */
  summary?: string;
  evidence?: {
    case_count?: number;
    first_seen?: string;
    last_seen?: string;
    frequency?: number;
    impact?: string;
    confidence?: number;
    affected_versions?: string[];
    representative_case_ids?: string[];
  };
  partitions?: {
    dev_count?: number;
    eval_count?: number;
    regression_count?: number;
  };
}

/** A member case of a pattern's suite. Mirrors the fields the case builder /
 * classifier record, so the detail view can show the full retrieval event. */
export interface PatternCase {
  case_id: string;
  round_id: string;
  span_id?: string;
  conversation_id?: string;
  tool_call_id?: string;
  '@timestamp': string;
  agent?: { name?: string; id?: string; class?: string };
  tool: string;
  query?: string;
  query_kind?: string;
  target_index?: string;
  returned?: { columns?: string[]; row_count?: number };
  status?: string;
  error?: string;
  duration_ms?: number;
  round_signals?: {
    esql_count?: number;
    raw_query_count?: number;
    ki_retrieval_count?: number;
    looped?: boolean;
    fell_back_to_raw?: boolean;
  };
  labels?: Array<{ type: string; sub_type?: string; confidence?: number }>;
  partition?: string;
  classifier_version?: string;
}

export type ImprovementStatus = 'proposed' | 'applied' | 'validated' | 'regressed' | 'rejected';

export interface Improvement {
  improvement_id: string;
  pattern_key: string;
  ai_index_id: string;
  status: ImprovementStatus;
  action?: string;
  target?: string;
  change_summary?: string;
  proposed_at?: string;
  applied_at?: string;
}

export interface ListPatternsResponse {
  patterns: Pattern[];
}

export interface ListPatternCasesResponse {
  cases: PatternCase[];
}

export interface ListImprovementsResponse {
  improvements: Improvement[];
}

export interface SelfImprovementResponse {
  enabled: boolean;
}

export interface ListTraceIndicesResponse {
  indices: string[];
}
