/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Semantic log search result status. */
export const SEARCH_STATUS = {
  SUCCESS: 'success',
  UNAVAILABLE: 'unavailable',
  ERROR: 'error',
} as const;

/** Reasons semantic log search is unavailable. */
export const UNAVAILABLE_REASON = {
  /** The target is missing one or more required fields. */
  MISSING_FIELDS: 'missing_fields',
  /** The target does not resolve to any indices. */
  NO_MATCHING_INDICES: 'no_matching_indices',
  /** The configured rerank inference endpoint is unavailable. */
  INFERENCE_UNAVAILABLE: 'inference_unavailable',
} as const;

/** Reasons semantic log search failed or was rejected. */
export const ERROR_REASON = {
  /** A capability check or categorization request timed out. */
  TIMEOUT: 'timeout',
  /** The caller aborted the request. */
  CANCELLED: 'cancelled',
  /** Search execution failed. */
  EXECUTION: 'execution',
  /** Request parameters failed validation. */
  INVALID_PARAMS: 'invalid_params',
  /** The count probe timed out or returned partial results. */
  SCOPE_TOO_LARGE: 'scope_too_large',
  /** The rerank request exceeded its inference or transport timeout. */
  INFERENCE_NOT_READY: 'inference_not_ready',
} as const;

/** Search phase associated with a failure. */
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
