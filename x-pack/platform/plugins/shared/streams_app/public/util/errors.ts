/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getFormattedError = (error: Error) => {
  if (
    error &&
    'body' in error &&
    typeof error.body === 'object' &&
    !!error.body &&
    'message' in error.body &&
    typeof error.body.message === 'string'
  ) {
    return new Error(error.body.message);
  }
  return error;
};

/**
 * Safely extracts a displayable error message from a task error.
 * Handles cases where the error might be an Error object instead of
 * the expected string type due to server-side serialization edge cases.
 */
export const getTaskErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return String(error);
};
