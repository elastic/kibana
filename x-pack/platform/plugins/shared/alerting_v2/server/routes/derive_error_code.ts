/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default fallback mapping from HTTP status codes to machine-readable error
 * codes. Used by `BaseAlertingRoute.onError` when an error reaches the route
 * boundary without a domain-specific code.
 *
 * Domain-specific codes (e.g. `RULE_NOT_FOUND`, `DUPLICATE_ID`) are preferred
 * because they carry intent that a status-derived code cannot. The codes here are
 * the floor, not the ceiling.
 */
const STATUS_CODE_MAP: Readonly<Record<number, string>> = Object.freeze({
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
});

export const deriveErrorCodeFromStatus = (statusCode: number): string => {
  const mapped = STATUS_CODE_MAP[statusCode];
  if (mapped) {
    return mapped;
  }

  if (statusCode >= 400 && statusCode < 500) {
    return 'BAD_REQUEST';
  }

  return 'INTERNAL_SERVER_ERROR';
};
