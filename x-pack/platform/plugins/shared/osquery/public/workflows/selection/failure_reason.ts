/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The message of a failed `core.http` call, falling back to `fallback`. */
export const failureReason = (error: unknown, fallback: string): string => {
  const httpError = error as { body?: { message?: unknown }; message?: unknown };
  if (typeof httpError.body?.message === 'string' && httpError.body.message) {
    return httpError.body.message;
  }

  if (typeof httpError.message === 'string' && httpError.message) {
    return httpError.message;
  }

  return fallback;
};

/** Whether a failed `core.http` call was an HTTP 404 (an unknown id, not a failed lookup). */
export const isNotFound = (error: unknown): boolean => {
  const httpError = error as {
    status?: unknown;
    response?: { status?: unknown };
    body?: { statusCode?: unknown };
  };

  return [httpError.status, httpError.response?.status, httpError.body?.statusCode].includes(404);
};
