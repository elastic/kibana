/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

export function isESClientError(error: unknown): error is errors.ResponseError {
  return error instanceof errors.ResponseError;
}

export function isElasticsearchVersionConflictError(error: Error): boolean {
  return isESClientError(error) && error.meta.statusCode === 409;
}

interface CatchAndSetErrorStackTrace {
  (error: Error, message?: string): Promise<never>;
  /**
   * Adds a message to the stack trace of the error whose stack trace will be updated.
   * Use it to further include info. for debugging purposes
   */
  withMessage(message: string): (error: Error) => Promise<never>;
}

/**
 * Error handling utility for use with promises that will set the stack trace on the error provided.
 * Especially useful when working with ES/SO client, as errors thrown by those client normally do
 * not include a very helpful stack trace.
 *
 * @param error
 * @param message
 *
 * @example
 *
 *    esClient.search(...).catch(catchAndSetErrorStackTrace);
 *
 *    // With custom message on error thrown
 *    esClient.search(...).catch(catchAndSetErrorStackTrace.withMessage('update to item xyz failed'));
 *
 */
export const catchAndSetErrorStackTrace: CatchAndSetErrorStackTrace = (
  error: Error,
  message: string = ''
): Promise<never> => {
  const priorStackTrace = error.stack;
  Error.captureStackTrace(error, catchAndSetErrorStackTrace);
  error.stack += `\n----[ ORIGINAL STACK TRACE ]----\n${priorStackTrace}`;

  if (message) {
    error.stack = message + '\n' + error.stack;
  }

  return Promise.reject(error);
};

catchAndSetErrorStackTrace.withMessage = (message) => {
  return (err: Error) => catchAndSetErrorStackTrace(err, message);
};
