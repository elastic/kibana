/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepStatus } from '../../../common/workflows/contract/schemas';

export interface QueryCounters {
  responded: number;
  pending: number;
  failed: number;
  successful: number;
}

const UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000 } as const;

/** Invalid or missing values use the default; values above the cap are clamped. */
export const parseWaitTimeoutMs = (
  value: string | undefined,
  { defaultMs, maxMs }: { defaultMs: number; maxMs: number }
): number => {
  const match = value?.match(/^([1-9][0-9]*)(s|m|h)$/);
  if (!match) return defaultMs;

  return Math.min(Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS], maxMs);
};

const finishedStatus = (counters: QueryCounters): StepStatus => {
  if (counters.failed === 0) return 'success';
  if (counters.successful === 0) return 'failed';

  return 'partial';
};

/** First matching row of the status table; `undefined` means keep polling. */
export const deriveStepStatus = (
  counters: QueryCounters,
  deadlinePassed: boolean
): StepStatus | undefined => {
  if (deadlinePassed) {
    if (counters.responded === 0) return 'timed_out';
    // Polls are spaced out, so a run that finished just before the deadline is often first
    // seen after it: report it as finished, not as cut short.
    if (counters.pending === 0) return finishedStatus(counters);
    if (counters.successful === 0) return 'failed';

    return 'partial';
  }

  if (counters.pending === 0) return finishedStatus(counters);

  return undefined;
};
