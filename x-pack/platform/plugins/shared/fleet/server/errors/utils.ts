/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import { FleetErrorWithStatusCode, FleetNotFoundError } from '.';

export function isESClientError(error: unknown): error is errors.ResponseError {
  return error instanceof errors.ResponseError;
}

export function isElasticsearchVersionConflictError(error: Error): boolean {
  return isESClientError(error) && error.meta.statusCode === 409;
}

export const wrapWithFleetErrorIfNeeded = (
  err: Error,
  messagePrefix?: string
): FleetErrorWithStatusCode => {
  if (err instanceof FleetErrorWithStatusCode) {
    return err;
  }

  let message = `${messagePrefix ? `${messagePrefix}: ` : ''}${err.message}`;

  if (isESClientError(err)) {
    message += ` (Status Code: [${err.statusCode}], body: [${JSON.stringify(err.body)}])`;
  }

  return new FleetErrorWithStatusCode(message, undefined, err);
};

interface CatchAndWrapError {
  (error: Error): Promise<never>;
  withMessage(message: string): (error: Error) => Promise<never>;
}

/**
 * Error handling utility for use with promises that will wrap any thrown error with a `FleetError`.
 * Especially useful when working with ES/SO client, as errors thrown by those client normally do
 * not include a very helpful stack trace.
 *
 * @param error
 *
 * @example
 *
 *    esClient.search(...).catch(catchAndWrapError);
 *
 *    // With custom message on error thrown
 *    esClient.search(...).catch(catchAndWrapError.withMessage('update to item xyz failed'));
 *
 */
export const catchAndWrapError: CatchAndWrapError = (error: Error): Promise<never> => {
  return Promise.reject(wrapWithFleetErrorIfNeeded(error));
};

catchAndWrapError.withMessage = (message) => {
  return (err: Error) => Promise.reject(wrapWithFleetErrorIfNeeded(err, message));
};

/** Determine if an error from Fleet is a "Not found" type */
export const isFleetNotFoundError = (err: Error): boolean => {
  return (
    err instanceof FleetNotFoundError ||
    ('statusCode' in err && err.statusCode === 404) ||
    (err as { output?: { statusCode: number } }).output?.statusCode === 404
  );
};
