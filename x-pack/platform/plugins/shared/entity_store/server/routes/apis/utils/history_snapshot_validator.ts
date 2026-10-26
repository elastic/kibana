/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { HistorySnapshotBodyParams } from '../../constants';
import { parseDurationToMs } from '../../../infra/time';

const MIN_HISTORY_SNAPSHOT_FREQUENCY_MS = 60 * 60 * 1000; // 1h

const MAX_HISTORY_SNAPSHOT_FREQUENCY_INTERVAL_DAYS = 1000;
const MAX_HISTORY_SNAPSHOT_FREQUENCY_MS =
  MAX_HISTORY_SNAPSHOT_FREQUENCY_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

function validateHistorySnapshotParams(
  data: z.infer<typeof HistorySnapshotBodyParams> | undefined,
  ctx: z.RefinementCtx
): void {
  if (!data?.frequency) return;
  if (!isValidHistorySnapshotFrequency(data.frequency)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['frequency'],
      message: `must be a valid duration between 1 hour and ${MAX_HISTORY_SNAPSHOT_FREQUENCY_INTERVAL_DAYS} days (e.g. 1h, 24h, 30d)`,
    });
  }
}

function isValidHistorySnapshotFrequency(frequency: string): boolean {
  try {
    const ms = parseDurationToMs(frequency);
    return ms >= MIN_HISTORY_SNAPSHOT_FREQUENCY_MS && ms <= MAX_HISTORY_SNAPSHOT_FREQUENCY_MS;
  } catch {
    return false;
  }
}

/** `frequency` (interval) and `retentionDays`. An empty object is valid; callers that require a change refine further. */
export const HistorySnapshotConfigSchema = lazySchema(() =>
  HistorySnapshotBodyParams.superRefine(validateHistorySnapshotParams)
);
