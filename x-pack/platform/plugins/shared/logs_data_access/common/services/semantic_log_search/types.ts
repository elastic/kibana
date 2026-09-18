/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * A log pattern represents a group of log messages that share a common template.
 *
 * The field names follow the convention established by `get_log_groups`:
 * - `pattern`: the template text (e.g. "Connection refused to * after * retries")
 * - `count`: number of documents matching this pattern in the time window
 * - `firstSeen` / `lastSeen`: ISO timestamps bounding the pattern's occurrences
 * - `sample`: a representative document with `_id`, `_index`, `@timestamp`
 */
export interface LogPattern {
  /** The categorized field, e.g. 'message' */
  field: string;
  /** The template text, also serves as the handle for expand */
  pattern: string;
  /** Number of documents matching this pattern in the time window */
  count: number;
  /** ISO timestamp of the first occurrence */
  firstSeen: string;
  /** ISO timestamp of the last occurrence */
  lastSeen: string;
  /** A representative document: _id, _index, @timestamp and selected fields */
  sample: Record<string, unknown>;
  /**
   * Reranker relevance score (logit, not normalized to 0-1).
   * Empirically observed on `.rerank-v1-elasticsearch`: relevant patterns scored
   * around +3.46, irrelevant ones around -5.65 to -6.12. If the inference endpoint
   * changes, the scale may shift. Only present when the search strategy uses RERANK.
   */
  relevanceScore?: number;
}

export interface TimeRange {
  /** Start of the time range in epoch milliseconds */
  start: number;
  /** End of the time range in epoch milliseconds */
  end: number;
}

export interface SemanticLogSearchParams {
  esClient: ElasticsearchClient;
  /** Index, data stream, or index pattern to search */
  target: string;
  /** Natural language query (not KQL) */
  nlQuery: string;
  /** Time range in epoch milliseconds */
  timeRange: TimeRange;
  /** Maximum number of patterns to return (default: 10) */
  maxPatterns?: number;
  /** Optional KQL filter to scope the search corpus */
  kqlFilter?: string;
}

export interface SemanticLogSearchResult {
  patterns: LogPattern[];
  /**
   * Which ranking strategy produced this result. Debug / eval signal only:
   * callers should not branch on it. Currently always `esql_rerank` when
   * the service can run; omitted when `unavailable` is true.
   */
  strategy?: string;
  /**
   * True when the service cannot operate because the cluster has no RERANK
   * inference endpoint. Callers should fall back to existing lexical search.
   */
  unavailable?: boolean;
}

export interface ExpandPatternParams {
  esClient: ElasticsearchClient;
  /** Index, data stream, or index pattern to search */
  target: string;
  /** The categorized field from LogPattern */
  field: string;
  /** The pattern text from LogPattern */
  pattern: string;
  /** Time range in epoch milliseconds */
  timeRange: TimeRange;
  /** Number of documents per page (default: 50) */
  pageSize?: number;
  /** Sort values from the last document for pagination */
  searchAfter?: Array<string | number>;
}

export interface ExpandPatternResult {
  /** Raw log documents */
  documents: Array<Record<string, unknown>>;
  /** Sort values for the next page, undefined when no more pages */
  searchAfter?: Array<string | number>;
}

/**
 * Service for semantic log search and pattern expansion.
 *
 * The implemented search path is RERANK + CATEGORIZE. The pre-indexed rungs
 * (semantic_text / pattern_text) and `expand` are not implemented; the planned
 * direction is to feed patterns from Knowledge Indicators in the AI Index.
 *
 * The service returns log patterns ranked by semantic relevance to the query,
 * with counts and time bounds for each pattern.
 */
export interface SemanticLogSearchService {
  /**
   * Search for log patterns matching a natural language query.
   *
   * Returns patterns ranked by semantic relevance, each with:
   * - `pattern`: the template text
   * - `count`: prevalence in the time window
   * - `firstSeen` / `lastSeen`: time bounds
   * - `sample`: a representative document
   *
   * `strategy` names the ranking path that produced the result. It is a debug
   * and eval signal, not something callers should branch on.
   */
  search(params: SemanticLogSearchParams): Promise<SemanticLogSearchResult>;

  /**
   * Expand a pattern to retrieve its raw documents.
   *
   * To be implemented.
   */
  expand(params: ExpandPatternParams): Promise<ExpandPatternResult>;
}
