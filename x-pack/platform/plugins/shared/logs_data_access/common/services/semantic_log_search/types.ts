/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { UnavailableReason, ErrorReason, SearchPhase } from './constants';

/** A group of log messages sharing a category template. */
export interface LogPattern {
  /** Name of the categorized field, such as `message`. */
  field: string;
  /** Category template text. */
  pattern: string;
  /** Exact count without sampling; an extrapolated estimate that can exceed corpus size with sampling. */
  count: number;
  /** Earliest ISO 8601 timestamp in the category, or its sample when sampling is used. */
  firstSeen: string;
  /** Latest ISO 8601 timestamp in the category, or its sample when sampling is used. */
  lastSeen: string;
  /** Representative log fields containing truncated message text. */
  sample: { message: string };
  /** Uncalibrated relevance score, comparable only within the same response. */
  relevanceScore?: number;
}

export interface TimeRange {
  /** Inclusive start of the time range in epoch milliseconds. */
  start: number;
  /** Exclusive end of the time range in epoch milliseconds. */
  end: number;
}

export interface SemanticLogSearchParams {
  /** Elasticsearch client scoped to the caller's permissions. */
  esClient: ElasticsearchClient;
  /** Index, data stream, or comma-separated index patterns to search. */
  target: string;
  /** Natural-language query used to rank log patterns. */
  nlQuery: string;
  /** Time range used to filter logs before categorization. */
  timeRange: TimeRange;
  /** Maximum number of patterns to return, from 1 to 100; defaults to 10. */
  maxPatterns?: number;
  /** KQL filter applied before categorization. */
  kqlFilter?: string;
  /** Abort signal forwarded to ES|QL and rerank requests. */
  abortSignal?: AbortSignal;
}

/** Search failure phase and error type. */
export interface SearchDiagnostics {
  phase: SearchPhase;
  /** Elasticsearch's error type or a JavaScript Error name, when available. */
  elasticsearchErrorType?: string;
}

export type SemanticLogSearchResult =
  | { status: 'success'; patterns: LogPattern[] }
  | { status: 'unavailable'; reason: UnavailableReason }
  | { status: 'error'; reason: ErrorReason; diagnostics?: SearchDiagnostics };

/** Retrieves log patterns ranked by semantic relevance. */
export interface SemanticLogSearchService {
  /** Searches for log patterns within the requested scope. */
  search(params: SemanticLogSearchParams): Promise<SemanticLogSearchResult>;
}
