/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_EVERY_SECONDS, MAX_RUN_AT_AHEAD_MS, MIN_EVERY_SECONDS } from '../../common';
import type { CreateJobBody, CreateJobResponse } from '../../common';
import { formatTime } from './format';

export interface NewJobInput {
  query: string;
  /** Text of the "Repeat every" seconds field; undefined when repeating is off. */
  every?: string;
  /** The "Run at" time in ms; undefined when it's off, null when it's on but empty. */
  runAtMs?: number | null;
}

export interface NewJobErrors {
  query?: string;
  every?: string;
  runAt?: string;
}

const everyError = (every: string): string | undefined => {
  const seconds = Number(every);
  return every.trim() !== '' &&
    Number.isInteger(seconds) &&
    seconds >= MIN_EVERY_SECONDS &&
    seconds <= MAX_EVERY_SECONDS
    ? undefined
    : `Enter whole seconds from ${MIN_EVERY_SECONDS} to ${MAX_EVERY_SECONDS}`;
};

const runAtError = (runAtMs: number | null, nowMs: number): string | undefined => {
  if (runAtMs === null || Number.isNaN(runAtMs)) {
    return 'Pick a date and time';
  }
  return runAtMs > nowMs + MAX_RUN_AT_AHEAD_MS ? 'Pick a time at most 30 days ahead' : undefined;
};

export const newJobErrors = ({ query, every, runAtMs }: NewJobInput, nowMs: number) => {
  const errors: NewJobErrors = {
    query: query.trim() === '' ? 'Enter a query' : undefined,
    every: every === undefined ? undefined : everyError(every),
    runAt: runAtMs === undefined ? undefined : runAtError(runAtMs, nowMs),
  };
  return { errors, valid: !errors.query && !errors.every && !errors.runAt };
};

/** The create-job body for valid input. */
export const createJobBody = (
  { query, every, runAtMs }: NewJobInput,
  idempotencyKey: string
): CreateJobBody => ({
  query: query.trim(),
  ...(every === undefined ? {} : { everySeconds: Number(every) }),
  ...(runAtMs === undefined || runAtMs === null ? {} : { runAt: new Date(runAtMs).toISOString() }),
  idempotencyKey,
});

/** The success toast. A scheduled job or a future `runAt` has no task yet. */
export const createdMessage = (
  body: CreateJobBody,
  { jobId, taskId }: CreateJobResponse
): { title: string; text?: string } => {
  if (body.everySeconds !== undefined) {
    const first = body.runAt
      ? `first at ${formatTime(body.runAt)}`
      : `first in ${body.everySeconds}s`;
    return {
      title: `Created scheduled job ${jobId}`,
      text: `It fires every ${body.everySeconds}s, ${first}.`,
    };
  }
  if (taskId) {
    return { title: `Created one-shot job ${jobId}`, text: `Task ${taskId} is queued.` };
  }
  return {
    title: `Created one-shot job ${jobId}`,
    text: body.runAt ? `It fires once at ${formatTime(body.runAt)}.` : undefined,
  };
};
