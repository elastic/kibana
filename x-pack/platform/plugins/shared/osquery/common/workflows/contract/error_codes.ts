/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Codes raised as `ExecutionError.details.code` before anything is dispatched. */
export const PreDispatchErrorCode = {
  SAVED_QUERY_NOT_FOUND: 'SAVED_QUERY_NOT_FOUND',
  SAVED_QUERY_AMBIGUOUS: 'SAVED_QUERY_AMBIGUOUS',
  SAVED_QUERY_HAS_PLACEHOLDERS: 'SAVED_QUERY_HAS_PLACEHOLDERS',
  TARGET_LIMIT_EXCEEDED: 'TARGET_LIMIT_EXCEEDED',
  AGENTS_NOT_IN_SPACE: 'AGENTS_NOT_IN_SPACE',
  MISSING_PRIVILEGE: 'MISSING_PRIVILEGE',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  INVALID_INPUT: 'INVALID_INPUT',
} as const;

/** Codes returned in the step output (`error_code`) once the action may exist. */
export const OutputErrorCode = {
  DISPATCH_UNCONFIRMED: 'DISPATCH_UNCONFIRMED',
  ACTION_NOT_VISIBLE: 'ACTION_NOT_VISIBLE',
  STATUS_UNREADABLE_FORBIDDEN: 'STATUS_UNREADABLE_FORBIDDEN',
} as const;

export type PreDispatchErrorCodeValue =
  (typeof PreDispatchErrorCode)[keyof typeof PreDispatchErrorCode];
export type OutputErrorCodeValue = (typeof OutputErrorCode)[keyof typeof OutputErrorCode];
