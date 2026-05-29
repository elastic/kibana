/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { elapsedMs, roundMs } from './clock';
import type { DispatcherStageCounts, DispatcherTickLogMeta, DispatcherTickSummary } from './types';

const TICK_COMPLETE_MESSAGE = 'dispatcher tick complete';

const ZERO_COUNTS: DispatcherStageCounts = Object.freeze({
  episodes: 0,
  suppressions: 0,
  dispatchable: 0,
  suppressed: 0,
  rules: 0,
  policies: 0,
  matched: 0,
  groups: 0,
  dispatch: 0,
  throttled: 0,
});

export interface BuildTickSummaryParams {
  readonly startedAt: Date;
  readonly startedAtNs: bigint;
  readonly previousStartedAt: Date;
  readonly completed: boolean;
  readonly haltReason: DispatcherTickSummary['halt_reason'];
  readonly stages: DispatcherTickSummary['stages'];
}

/**
 * Assemble a `DispatcherTickSummary` from the raw inputs collected during
 * a tick. The wall-clock `started_at`/`finished_at` are ISO-8601 strings
 * for display; `duration_ms` is derived from the monotonic `startedAtNs`
 * so it aligns with the per-stage clock in `DispatcherStageTiming`.
 */
export function buildTickSummary({
  startedAt,
  startedAtNs,
  previousStartedAt,
  completed,
  haltReason,
  stages,
}: BuildTickSummaryParams): DispatcherTickSummary {
  const finishedAt = new Date();
  return {
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: roundMs(elapsedMs(startedAtNs)),
    previous_started_at: previousStartedAt.toISOString(),
    completed,
    halt_reason: haltReason,
    stages,
    totals: stages.length === 0 ? ZERO_COUNTS : stages[stages.length - 1].counts,
  };
}

/**
 * Emit the tick summary as a single structured info-level log entry.
 *
 * The payload is nested under `kibana.alerting_v2.dispatcher.tick` so
 * ES|QL queries can target a stable namespace without ECS collisions.
 */
export function emitTickSummary(logger: LoggerServiceContract, tick: DispatcherTickSummary): void {
  logger.info<DispatcherTickLogMeta>({
    message: TICK_COMPLETE_MESSAGE,
    meta: {
      kibana: {
        alerting_v2: {
          dispatcher: { tick },
        },
      },
    },
  });
}
