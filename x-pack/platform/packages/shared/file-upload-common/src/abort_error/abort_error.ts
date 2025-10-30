/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Class used to signify that something was aborted. Useful for applications to conditionally handle
 * this type of error differently than other errors.
 */
export class AbortError extends Error {
  constructor(message = 'Aborted') {
    super(message);
    this.message = message;
    this.name = 'AbortError';
  }
}

export function isAbortError(error: unknown): error is AbortError {
  return error instanceof AbortError || (error instanceof Error && error.name === 'AbortError');
}
