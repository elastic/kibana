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

/**
 * Detects environmental Elasticsearch cluster block errors that are not caused by Fleet itself
 * and cannot be resolved by retrying or rolling back (e.g. a flood-stage disk watermark placing a
 * `read-only-allow-delete` block on an index). Retrying or rolling back an install in this state
 * simply hits the same block again, producing a repetitive error storm, so callers should back off
 * instead. The underlying failure is typically re-wrapped by the time it reaches package install
 * failure handling, so the error message is inspected as well as the raw ES response.
 */
export function isElasticsearchReadOnlyBlockError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.message}${error.stack ? `\n${error.stack}` : ''}`
      : String(error);

  return (
    message.includes('cluster_block_exception') ||
    message.includes('read-only-allow-delete') ||
    message.includes('flood-stage watermark') ||
    message.includes('disk usage exceeded flood-stage watermark')
  );
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
