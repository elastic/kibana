/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SWALLOWED_HTTP_STATUSES = new Set([401, 403, 503]);

interface HttpStatusCarrier {
  name?: string;
  response?: { status?: number };
  body?: { statusCode?: number };
  statusCode?: number;
  cause?: unknown;
  original?: unknown;
  error?: unknown;
}

const getHttpStatus = (
  error: unknown,
  seen: WeakSet<object> = new WeakSet()
): number | undefined => {
  if (error == null || typeof error !== 'object' || seen.has(error)) {
    return undefined;
  }
  seen.add(error);

  const candidate = error as HttpStatusCarrier;
  const status = candidate.response?.status ?? candidate.body?.statusCode ?? candidate.statusCode;

  if (typeof status === 'number') {
    return status;
  }

  return (
    getHttpStatus(candidate.cause, seen) ??
    getHttpStatus(candidate.original, seen) ??
    getHttpStatus(candidate.error, seen)
  );
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

/**
 * True for abort, privilege (401/403), and 503 (index/service not ready) errors
 * that should not surface as episodes fetch toasts.
 */
export const shouldSwallowFetchError = (error: unknown): boolean => {
  if (isAbortError(error)) {
    return true;
  }

  const status = getHttpStatus(error);
  return status != null && SWALLOWED_HTTP_STATUSES.has(status);
};
