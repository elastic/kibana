/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core/public';

const isHttpFetchError = (error: unknown): error is IHttpFetchError =>
  typeof error === 'object' && error !== null && 'response' in error;

interface ErrorBody {
  statusCode?: unknown;
  message?: unknown;
}

const getBody = (error: IHttpFetchError): ErrorBody =>
  typeof error.body === 'object' && error.body !== null ? error.body : {};

/** The HTTP status of a failed request, when the error came from `http.fetch`. */
export const getHttpErrorStatus = (error: unknown): number | undefined => {
  if (!isHttpFetchError(error)) {
    return undefined;
  }
  const { statusCode } = getBody(error);
  return error.response?.status ?? (typeof statusCode === 'number' ? statusCode : undefined);
};

/** A readable message, preferring the message the server sent. */
export const getHttpErrorMessage = (error: unknown): string => {
  if (isHttpFetchError(error)) {
    const bodyMessage = getBody(error).message;
    if (typeof bodyMessage === 'string' && bodyMessage.length > 0) {
      return bodyMessage;
    }
  }
  return error instanceof Error ? error.message : String(error);
};

/** An `Error` whose message is the server message, suitable for `toasts.addError`. */
export const toDisplayError = (error: unknown): Error => {
  const message = getHttpErrorMessage(error);
  if (error instanceof Error && error.message === message) {
    return error;
  }
  return new Error(message);
};
