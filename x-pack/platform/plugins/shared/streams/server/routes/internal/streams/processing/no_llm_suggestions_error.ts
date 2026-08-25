/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Error thrown when the LLM does not provide tool calls in its response.
 * This indicates that suggestions could not be generated, but is not
 * necessarily an error condition - it should be handled gracefully by
 * showing "no suggestions found" to the user.
 */
export class NoLLMSuggestionsError extends Error {
  constructor(message: string = 'The LLM response did not contain any tool calls') {
    super(message);
    this.name = 'NoLLMSuggestionsError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NoLLMSuggestionsError);
    }
  }
}

export function isNoLLMSuggestionsError(error: unknown): error is NoLLMSuggestionsError {
  return error instanceof NoLLMSuggestionsError;
}
