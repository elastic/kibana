/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError } from 'axios';

const NETWORK_ERROR_BUCKETS: ReadonlyArray<{ description: string; codes: readonly string[] }> = [
  {
    description: 'The hostname could not be resolved',
    codes: ['ENOTFOUND', 'EAI_AGAIN'],
  },
  {
    description: 'The connection could not be established',
    codes: ['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH'],
  },
  {
    description: 'The connection was interrupted before a response was received',
    codes: ['ECONNRESET', 'EPIPE'],
  },
  {
    description: 'The request timed out waiting for a response',
    codes: ['ECONNABORTED'],
  },
];

const DESCRIPTION_BY_CODE: ReadonlyMap<string, string> = new Map(
  NETWORK_ERROR_BUCKETS.flatMap(({ description, codes }) =>
    codes.map((code): [string, string] => [code, description])
  )
);

const getDescription = (error: unknown): string | undefined =>
  error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? DESCRIPTION_BY_CODE.get(error.code)
    : undefined;

// Node reports the underlying system error as the axios `cause`, wrapped in an
// `AggregateError` when several addresses were attempted; fall back to the error itself
// for failures axios reports directly, such as timeouts.
const findNetworkError = (error: AxiosError): { error: Error; description: string } | undefined => {
  if (error.response) return undefined;

  const { cause } = error;
  const causes = cause instanceof AggregateError ? cause.errors : [cause];

  for (const candidate of [...causes, error]) {
    const description = getDescription(candidate);
    if (description !== undefined && candidate instanceof Error) {
      return { error: candidate, description };
    }
  }

  return undefined;
};

/**
 * Whether the axios error was caused by a network failure rather than a response from the service.
 */
export const isNetworkError = (error: AxiosError): boolean => findNetworkError(error) !== undefined;

/**
 * Returns a user-friendly message, keeping the original error details, for axios errors
 * caused by a network failure, or `undefined` when the error is not one.
 */
export const getNetworkErrorMessage = (error: AxiosError): string | undefined => {
  const match = findNetworkError(error);
  if (match === undefined) return undefined;

  const { error: networkError, description } = match;
  return networkError.message ? `${description} (${networkError.message})` : description;
};

/**
 * Overwrites the message of a network-level axios error in place with `getNetworkErrorMessage`,
 * leaving `code`, `cause` and the stack untouched. Non-network errors are left as-is.
 */
export const applyNetworkErrorMessage = (error: AxiosError): void => {
  const message = getNetworkErrorMessage(error);
  if (message !== undefined) {
    error.message = message;
  }
};
