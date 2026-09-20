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
  MISSING_FIELDS: 'missing_fields',
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
} as const;

export type SearchStatus = (typeof SEARCH_STATUS)[keyof typeof SEARCH_STATUS];
export type UnavailableReason = (typeof UNAVAILABLE_REASON)[keyof typeof UNAVAILABLE_REASON];
export type ErrorReason = (typeof ERROR_REASON)[keyof typeof ERROR_REASON];
