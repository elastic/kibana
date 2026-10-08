/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AiInsightsPanelSummary {
  id: string;
  title: string;
  type: string;
  esql?: string;
}

export interface AiInsightsDataSource {
  id?: string;
  title: string;
  index_pattern: string;
  time_field?: string;
}

export interface AiInsightsDashboardContext {
  title: string;
  description: string;
  panels: AiInsightsPanelSummary[];
  data_sources: AiInsightsDataSource[];
}

export interface AiInsightsSearchQuery {
  language: string;
  query: string;
}

export interface AiInsightsRequestBody {
  connector_id: string;
  dashboard: AiInsightsDashboardContext;
  time_range: {
    from: string;
    to: string;
  };
  /** Human-readable query string for the LLM (KQL/Lucene/ES|QL text). */
  query?: string;
  /** Structured KQL/Lucene query applied to data-source metric prefetch. */
  search_query?: AiInsightsSearchQuery;
  /** Dashboard filters applied to data-source metric prefetch. */
  filters?: unknown[];
  filters_summary?: string;
}

export type AiInsightsStatus = 'green' | 'yellow' | 'red';

export interface AiInsightsResult {
  /** Overall Red / Yellow / Green assessment. */
  status: AiInsightsStatus;
  /** One or two sentences explaining the status. */
  summary: string;
  attention_points: string[];
  suggested_actions: string[];
  /** Username (or email) of the user who initiated generation. */
  generated_by?: string;
  /** ISO timestamp when the insight was generated. */
  generated_at?: string;
}

export type AiInsightsGenerationMode = 'automatic' | 'on_demand';
export type AiInsightsRefreshMode = 'auto' | 'manual';
export type AiInsightsHeightMode = 'auto' | 'fixed';
