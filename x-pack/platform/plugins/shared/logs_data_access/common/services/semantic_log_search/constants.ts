/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Top-level discriminant of `SemanticLogSearchResult`. */
export const SEARCH_STATUS = {
  SUCCESS: 'success',
  UNAVAILABLE: 'unavailable',
  ERROR: 'error',
} as const;

/** The search cannot run against this target or cluster at all; retrying will not help. */
export const UNAVAILABLE_REASON = {
  /**
   * The target resolves to at least one index, but they do not expose `message` and `@timestamp`.
   * A mapping problem: the data is there and cannot be categorized.
   */
  MISSING_FIELDS: 'missing_fields',
  /**
   * The target resolves to no index at all, so there is nothing to search.
   * Distinct from `MISSING_FIELDS` because the fix is different: correct the target, do not go
   * looking at mappings. Reported for both an empty wildcard match and an absent concrete index.
   */
  NO_MATCHING_INDICES: 'no_matching_indices',
  INFERENCE_UNAVAILABLE: 'inference_unavailable',
} as const;

export const ERROR_REASON = {
  /** The search or a capability check timed out; retrying may help. */
  TIMEOUT: 'timeout',
  /** The request was aborted by the caller; do not retry automatically. */
  CANCELLED: 'cancelled',
  /** An unexpected error occurred; do not retry automatically. */
  EXECUTION: 'execution',
  /** The provided parameters were rejected; correct them before retrying. */
  INVALID_PARAMS: 'invalid_params',
  /**
   * The count probe timed out: the scope is too broad to categorize within the budget.
   * Unlike `TIMEOUT`, this is actionable — a narrower time range or KQL filter may succeed.
   */
  SCOPE_TOO_LARGE: 'scope_too_large',
  /**
   * The rerank endpoint did not respond in time, typically because its model is still loading.
   * Retrying shortly may succeed; narrowing the query will not, since the cause is not query cost.
   */
  INFERENCE_NOT_READY: 'inference_not_ready',
} as const;

/**
 * Stage of the search a failure happened in, reported to the caller alongside the reason.
 *
 * Lives here rather than with the search implementation because it is part of the result contract:
 * a reason says what went wrong, a phase says where, and "where" is what makes an `execution`
 * failure diagnosable without server log access.
 */
export const SEARCH_PHASE = {
  CAPABILITIES: 'capabilities',
  PROBE: 'probe',
  SEARCH: 'search',
  RERANK: 'rerank',
} as const;

export type SearchStatus = (typeof SEARCH_STATUS)[keyof typeof SEARCH_STATUS];
export type UnavailableReason = (typeof UNAVAILABLE_REASON)[keyof typeof UNAVAILABLE_REASON];
export type ErrorReason = (typeof ERROR_REASON)[keyof typeof ERROR_REASON];
export type SearchPhase = (typeof SEARCH_PHASE)[keyof typeof SEARCH_PHASE];
