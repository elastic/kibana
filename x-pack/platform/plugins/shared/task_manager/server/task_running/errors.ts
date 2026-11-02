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

/**
 * JSON-safe form of a {@link DecoratedError}. The metadata lives under private Symbols, which
 * `JSON.stringify` drops, so errors crossing a process boundary (task pods) are carried explicitly.
 */
export interface SerializedTaskRunError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  retry?: string | boolean;
  source?: TaskErrorSource;
  /** HTTP status of a Boom (`output.statusCode`) or Elasticsearch (`meta.statusCode`) error. */
  statusCode?: number;
}

const getStatusCode = (error: unknown): number | undefined => {
  const e = error as {
    statusCode?: unknown;
    output?: { statusCode?: unknown };
    meta?: { statusCode?: unknown };
  };
  const value = e.output?.statusCode ?? e.meta?.statusCode ?? e.statusCode;
  return typeof value === 'number' ? value : undefined;
};

export function serializeTaskRunError(error: unknown): SerializedTaskRunError {
  const err = error instanceof Error ? error : new Error(String(error));
  const decorated = err as DecoratedError;
  const retryValue = decorated[retry];
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...(decorated[code] ? { code: decorated[code] } : {}),
    ...(retryValue !== undefined
      ? { retry: retryValue instanceof Date ? retryValue.toISOString() : retryValue }
      : {}),
    // `getErrorSource` also classifies ES 401s as user errors, which the original error object
    // would otherwise lose once it is no longer an ES `ResponseError`.
    ...(getErrorSource(err) ? { source: getErrorSource(err) } : {}),
    ...(getStatusCode(err) !== undefined ? { statusCode: getStatusCode(err) } : {}),
  };
}

export function deserializeTaskRunError(serialized: SerializedTaskRunError): DecoratedError {
  const error = new Error(serialized.message) as DecoratedError;
  error.name = serialized.name;
  if (serialized.stack) error.stack = serialized.stack;
  if (serialized.code === CODE_UNRECOVERABLE) {
    error[code] = CODE_UNRECOVERABLE;
  } else if (serialized.code === CODE_RETRYABLE) {
    createRetryableError(
      error,
      typeof serialized.retry === 'string' ? new Date(serialized.retry) : Boolean(serialized.retry)
    );
  }
  if (serialized.source) error[source] = serialized.source;
  if (serialized.statusCode !== undefined) {
    // Shaped so status checks written against Boom and Elasticsearch errors keep working on callers
    // that only see the rebuilt error.
    Object.assign(error, {
      statusCode: serialized.statusCode,
      output: { statusCode: serialized.statusCode, payload: { message: serialized.message } },
      meta: { statusCode: serialized.statusCode },
    });
  }
  return error;
}
