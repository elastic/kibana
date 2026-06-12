/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUnauthorizedError } from '@kbn/es-errors';

import { TaskErrorSource } from '../../common';

export { TaskErrorSource };

// Unrecoverable
const CODE_UNRECOVERABLE = 'TaskManager/unrecoverable';
const CODE_RETRYABLE = 'TaskManager/retryable';

const code = Symbol('TaskManagerErrorCode');
const retry = Symbol('TaskManagerErrorRetry');
const source = Symbol('TaskManagerErrorSource');

export interface DecoratedError extends Error {
  [code]?: string;
  [retry]?: Date | boolean;
  [source]?: TaskErrorSource;
}

function isTaskManagerError(error: unknown): error is DecoratedError {
  return Boolean(error && (error as DecoratedError)[code]);
}

export function isUnrecoverableError(error: Error | DecoratedError) {
  return isTaskManagerError(error) && error[code] === CODE_UNRECOVERABLE;
}

export function throwUnrecoverableError(error: Error) {
  (error as DecoratedError)[code] = CODE_UNRECOVERABLE;
  throw error;
}

export function isRetryableError(error: Error | DecoratedError) {
  if (isTaskManagerError(error) && error[code] === CODE_RETRYABLE) {
    return error[retry];
  }
  return null;
}

export function createRetryableError(error: Error, shouldRetry: Date | boolean): DecoratedError {
  (error as DecoratedError)[code] = CODE_RETRYABLE;
  (error as DecoratedError)[retry] = shouldRetry;
  return error;
}

export function throwRetryableError(error: Error, shouldRetry: Date | boolean) {
  throw createRetryableError(error, shouldRetry);
}

export function createTaskRunError(
  error: Error,
  errorSource = TaskErrorSource.FRAMEWORK
): DecoratedError {
  (error as DecoratedError)[source] = errorSource;
  return error;
}

function isTaskRunError(error: Error | DecoratedError): error is DecoratedError {
  return Boolean(error && (error as DecoratedError)[source]);
}

export function getErrorSource(error: Error | DecoratedError): TaskErrorSource | undefined {
  if (isTaskRunError(error) && error[source]) {
    return error[source];
  }

  if (isUnauthorizedError(error)) {
    return TaskErrorSource.USER;
  }
}

export function isUserError(error: Error | DecoratedError) {
  return getErrorSource(error) === TaskErrorSource.USER;
}
