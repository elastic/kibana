/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A). Codec for Task Manager run results and decorated errors.
 * TM marks errors with module-private Symbols (retryable / unrecoverable / error source), which
 * no structured clone preserves; each side must use ITS OWN copy of the TM helpers. */

import {
  createRetryableError,
  createTaskRunError,
  getErrorSource,
  isRetryableError,
  isUnrecoverableError,
  throwUnrecoverableError,
} from '@kbn/task-manager-plugin/server/task_running';
import type { TaskErrorSource } from '@kbn/task-manager-plugin/common';

export interface WireTaskError {
  readonly message: string;
  readonly name: string;
  readonly stack?: string;
  readonly unrecoverable: boolean;
  readonly retry: Date | boolean | null;
  readonly source?: string;
}

export const encodeTaskError = (error: Error): WireTaskError => ({
  message: error.message,
  name: error.name,
  stack: error.stack,
  unrecoverable: isUnrecoverableError(error),
  retry: (isRetryableError(error) as Date | boolean | null | undefined) ?? null,
  source: getErrorSource(error),
});

export const decodeTaskError = (wire: WireTaskError): Error => {
  let error = new Error(wire.message);
  error.name = wire.name;
  if (wire.stack) error.stack = wire.stack;
  if (wire.source) error = createTaskRunError(error, wire.source as TaskErrorSource);
  if (wire.retry !== null && wire.retry !== undefined) error = createRetryableError(error, wire.retry);
  if (wire.unrecoverable) {
    // throwUnrecoverableError only decorates then throws; reproduce the decoration.
    try {
      throwUnrecoverableError(error);
    } catch (decorated) {
      return decorated as Error;
    }
  }
  return error;
};

export interface WireRunResult {
  readonly result?: Record<string, unknown>;
  readonly taskRunError?: WireTaskError;
  readonly error?: WireTaskError;
}

const tagDates = (value: unknown): unknown => {
  if (value instanceof Date) return { __date: value.toISOString() };
  if (Array.isArray(value)) return value.map(tagDates);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, tagDates(v)]));
  return value;
};

/** Encodes a RunResult: `taskRunError`/`error` fields carry decorated errors. */
export const encodeRunResult = (result: unknown): WireRunResult => {
  if (!result || typeof result !== 'object') return { result: undefined };
  const { taskRunError, error, ...rest } = result as Record<string, unknown>;
  return {
    // NB: a JSON.stringify replacer sees Date.toJSON() strings, never Dates — tag Dates first.
    result: JSON.parse(JSON.stringify(tagDates(rest))),
    ...(taskRunError instanceof Error ? { taskRunError: encodeTaskError(taskRunError) } : {}),
    ...(error instanceof Error ? { error: encodeTaskError(error) } : {}),
  };
};

const reviveDates = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(reviveDates);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.__date === 'string' && Object.keys(record).length === 1)
      return new Date(record.__date);
    return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, reviveDates(v)]));
  }
  return value;
};

export const decodeRunResult = (wire: WireRunResult): Record<string, unknown> | undefined => {
  if (!wire.result) return undefined;
  return {
    ...(reviveDates(wire.result) as Record<string, unknown>),
    ...(wire.taskRunError ? { taskRunError: decodeTaskError(wire.taskRunError) } : {}),
    ...(wire.error ? { error: decodeTaskError(wire.error) } : {}),
  };
};
