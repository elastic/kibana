/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

/** Extracts the `attributes.code` from an HTTP error body, or `undefined`. */
export const getCloseErrorCode = (error: unknown): string | undefined => {
  if (!isHttpFetchError(error)) return undefined;
  const body = error.body as { attributes?: { code?: string } } | undefined;
  return body?.attributes?.code;
};

/**
 * Set of `attributes.code` values that represent partial close outcomes.
 * The modal should stay open for these so the purpose-built callouts can run.
 */
export const KNOWN_CLOSE_ERROR_CODES = new Set([
  'close_targets_changed',
  'proposal_dismiss_failed',
  'escalation_close_incomplete',
  'linked_investigation_unavailable',
]);

/** Returns true when the error is a typed close failure the modal should handle. */
export const isKnownCloseError = (error: unknown): boolean => {
  const code = getCloseErrorCode(error);
  return code !== undefined && KNOWN_CLOSE_ERROR_CODES.has(code);
};

/** Returns true when the error code signals a partial outcome (some side effects already applied). */
export const isPartialCloseError = (error: unknown): boolean => {
  const code = getCloseErrorCode(error);
  return code === 'proposal_dismiss_failed' || code === 'escalation_close_incomplete';
};
