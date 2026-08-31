/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

/**
 * What a failed request should say. The browser client leaves the HTTP reason
 * phrase ("Conflict") in `message` and parses what the route said into the
 * body, so reading `message` alone is how a named dataset or space id turns
 * into one unhelpful word.
 */
export const getErrorMessage = (error: unknown): string => {
  const body = isHttpFetchError(error) ? error.body : undefined;

  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return error instanceof Error ? error.message : String(error);
};
