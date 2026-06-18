/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface HttpErrorBody {
  message?: unknown;
}

const isHttpErrorBody = (body: unknown): body is HttpErrorBody =>
  typeof body === 'object' && body !== null && 'message' in body;

/**
 * Prefer the API error payload over HttpFetchError.message (often just "Bad Request").
 */
export const getChangeHistoryErrorMessage = (error: Error): string | undefined => {
  const body = (error as { body?: unknown }).body;

  if (isHttpErrorBody(body) && typeof body.message === 'string' && body.message.length > 0) {
    return body.message;
  }

  return error.message.length > 0 ? error.message : undefined;
};
