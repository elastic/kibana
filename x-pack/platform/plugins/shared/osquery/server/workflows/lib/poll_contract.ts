/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseWaitMs } from '../../../common/workflows/contract/budget';
import type { StepStatus } from '../../../common/workflows/contract/schemas';

export interface QueryCounters {
  responded: number;
  pending: number;
  failed: number;
  successful: number;
}

/** Invalid or missing values use the default; values above the cap are clamped. */
export const parseWaitTimeoutMs = (
  value: string | undefined,
  { defaultMs, maxMs }: { defaultMs: number; maxMs: number }
): number => Math.min(parseWaitMs(value) ?? defaultMs, maxMs);

const finishedStatus = (counters: QueryCounters): StepStatus => {
  if (counters.failed === 0) return 'success';
  if (counters.successful === 0) return 'failed';

  return 'partial';
};

/**
 * First matching row of the status table; `undefined` means keep polling. `pending` is the
 * targeted agents minus the distinct agents that responded, so a duplicate response (Fleet
 * delivers at least once) does not change it. Anything at or below zero means every agent
 * answered.
 */
export const deriveStepStatus = (
  counters: QueryCounters,
  deadlinePassed: boolean
): StepStatus | undefined => {
  if (deadlinePassed) {
    if (counters.responded === 0) return 'timed_out';
    // Polls are spaced out, so a run that finished just before the deadline is often first
    // seen after it: report it as finished, not as cut short.
    if (counters.pending <= 0) return finishedStatus(counters);
    if (counters.successful === 0) return 'failed';

    return 'partial';
  }

  if (counters.pending <= 0) return finishedStatus(counters);

  return undefined;
};

/**
 * Pack status from its queries' statuses: every query `success` is `success`; every query
 * `timed_out` is `timed_out`; no query `success` or `partial` is `failed`; anything else is
 * `partial`. A `partial` query counts as some success. Callers never pass an empty list (a pack
 * without enabled queries fails before dispatch); it reads as `failed`.
 */
export const rollupPackStatus = (statuses: StepStatus[]): StepStatus => {
  if (statuses.length > 0 && statuses.every((status) => status === 'success')) return 'success';
  if (statuses.length > 0 && statuses.every((status) => status === 'timed_out')) return 'timed_out';
  if (!statuses.some((status) => status === 'success' || status === 'partial')) return 'failed';

  return 'partial';
};
