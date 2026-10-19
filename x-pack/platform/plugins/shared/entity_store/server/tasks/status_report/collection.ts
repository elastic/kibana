/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type CollectionOutcome = 'complete' | 'timed_out' | 'failed' | 'skipped';

export interface CollectionResult<T> {
  part: string;
  outcome: CollectionOutcome;
  durationMs: number;
  result?: T;
}

export const PART_TIMEOUT_MS = 30_000;
export const TASK_DEADLINE_MS = 9 * 60_000;

interface RunPartOptions<T> {
  part: string;
  timeoutMs?: number;
  deadline: number;
  taskSignal: AbortSignal;
  fn: (signal: AbortSignal) => Promise<T>;
}

/**
 * Runs one expensive query with its own timeout. A timeout, an error or a missed deadline
 * is reported in the outcome and never thrown, so the rest of the report still goes out.
 */
export const runPart = async <T>({
  part,
  timeoutMs = PART_TIMEOUT_MS,
  deadline,
  taskSignal,
  fn,
}: RunPartOptions<T>): Promise<CollectionResult<T>> => {
  const start = Date.now();
  if (taskSignal.aborted || deadline - start < timeoutMs) {
    return { part, outcome: 'skipped', durationMs: 0 };
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onTaskAbort = () => controller.abort();
  taskSignal.addEventListener('abort', onTaskAbort, { once: true });

  try {
    const result = await fn(controller.signal);
    return { part, outcome: 'complete', durationMs: Date.now() - start, result };
  } catch (e) {
    const outcome = timedOut && !taskSignal.aborted ? 'timed_out' : 'failed';
    return { part, outcome, durationMs: Date.now() - start };
  } finally {
    clearTimeout(timer);
    taskSignal.removeEventListener('abort', onTaskAbort);
  }
};

export const toCollectionEntry = ({
  part,
  outcome,
  durationMs,
}: CollectionResult<unknown>): {
  part: string;
  outcome: CollectionOutcome;
  durationMs: number;
} => ({
  part,
  outcome,
  durationMs,
});
