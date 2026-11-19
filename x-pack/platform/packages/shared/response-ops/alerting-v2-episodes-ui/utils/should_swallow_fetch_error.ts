/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PRIVILEGE_HTTP_STATUSES = new Set([401, 403]);
const SERVICE_UNAVAILABLE_HTTP_STATUS = 503;
const SECURITY_EXCEPTION_TYPE = 'security_exception';

interface HttpStatusCarrier {
  name?: string;
  response?: { status?: number };
  body?: { statusCode?: number };
  statusCode?: number;
  attributes?: { error?: { type?: string } };
  cause?: unknown;
  original?: unknown;
  error?: unknown;
}

const findInErrorChain = <T>(
  error: unknown,
  pick: (candidate: HttpStatusCarrier) => T | undefined,
  seen: WeakSet<object> = new WeakSet()
): T | undefined => {
  if (error == null || typeof error !== 'object' || seen.has(error)) {
    return undefined;
  }
  seen.add(error);

  const candidate = error as HttpStatusCarrier;
  return (
    pick(candidate) ??
    findInErrorChain(candidate.cause, pick, seen) ??
    findInErrorChain(candidate.original, pick, seen) ??
    findInErrorChain(candidate.error, pick, seen)
  );
};

const getHttpStatus = (error: unknown): number | undefined =>
  findInErrorChain(error, (candidate) => {
    const status = candidate.response?.status ?? candidate.body?.statusCode ?? candidate.statusCode;
    return typeof status === 'number' ? status : undefined;
  });

// ES|QL search errors (`EsError`) drop the HTTP status and only keep the ES error body.
const isSecurityException = (error: unknown): boolean =>
  findInErrorChain(error, (candidate) =>
    candidate.attributes?.error?.type === SECURITY_EXCEPTION_TYPE ? true : undefined
  ) ?? false;

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

/** True for errors caused by missing privileges (401/403 or ES `security_exception`). */
export const isPrivilegeFetchError = (error: unknown): boolean => {
  if (isSecurityException(error)) {
    return true;
  }

  const status = getHttpStatus(error);
  return status != null && PRIVILEGE_HTTP_STATUSES.has(status);
};

/**
 * True for abort, privilege (401/403 or ES `security_exception`), and 503
 * (index/service not ready) errors that should not surface as episodes fetch toasts.
 */
export const shouldSwallowFetchError = (error: unknown): boolean =>
  isAbortError(error) ||
  isPrivilegeFetchError(error) ||
  getHttpStatus(error) === SERVICE_UNAVAILABLE_HTTP_STATUS;
