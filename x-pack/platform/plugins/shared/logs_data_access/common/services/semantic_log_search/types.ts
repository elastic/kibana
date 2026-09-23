/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { UnavailableReason, ErrorReason } from './constants';

/** A log pattern: a group of log messages sharing a common template. */
export interface LogPattern {
  /** The categorized field, e.g. 'message' */
  field: string;
  /** The template text, also serves as the handle for expand */
  pattern: string;
  /** Estimated document count. May slightly exceed corpus size when sampling is active; treat as order-of-magnitude. */
  count: number;
  /** ISO timestamp of the first occurrence */
  firstSeen: string;
  /** ISO timestamp of the last occurrence */
  lastSeen: string;
  /** A representative document: _id, _index, @timestamp and selected fields */
  sample: Record<string, unknown>;
  /**
   * Reranker relevance score. Only present when the search strategy uses RERANK.
   *
   * Uncalibrated and specific to the endpoint that produced it, so it ranks within one response and
   * means nothing across responses or across endpoints. Measured on the default
   * `.rerank-v1-elasticsearch`, which returns logits: relevant patterns around +3.46, irrelevant
   * ones around -5.65 to -6.12. A hosted reranker on the same candidates returned +0.14 for the
   * top hit and negative values below it — a different scale entirely, and
   * `xpack.logsDataAccess.semanticLogSearch.rerankInferenceId` lets an operator choose one. Do not
   * compare these numbers to a fixed threshold.
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
  /** Cancels the Elasticsearch request when the caller is no longer interested in the result */
  abortSignal?: AbortSignal;
}

export type SemanticLogSearchResult =
  | { status: 'success'; patterns: LogPattern[] }
  | { status: 'unavailable'; reason: UnavailableReason }
  | { status: 'error'; reason: ErrorReason };

/** Service for semantic log search using CATEGORIZE + inference RERANK. */
export interface SemanticLogSearchService {
  /** Search for log patterns matching a natural language query. */
  search(params: SemanticLogSearchParams): Promise<SemanticLogSearchResult>;
}
