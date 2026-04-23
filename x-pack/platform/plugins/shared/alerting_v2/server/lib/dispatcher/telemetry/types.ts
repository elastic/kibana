/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMeta } from '@kbn/logging';
import type { DispatcherHaltReason } from '../types';

/**
 * Stable subset of `DispatcherPipelineState` field names used as count keys.
 * Always emitted (defaulting to 0) so downstream consumers (APM, logs, ES|QL)
 * can aggregate without special-casing per stage.
 */
export type DispatcherCountKey =
  | 'episodes'
  | 'suppressions'
  | 'dispatchable'
  | 'suppressed'
  | 'rules'
  | 'policies'
  | 'matched'
  | 'groups'
  | 'dispatch'
  | 'throttled';

/**
 * Counts of entities present in the pipeline state after a given stage
 * completes. All keys are always present so downstream aggregations never
 * need to tolerate missing fields.
 */
export type DispatcherStageCounts = Readonly<Record<DispatcherCountKey, number>>;

/**
 * Minimal, log-safe representation of an error thrown by a pipeline step.
 * Only the class name and message are kept here — stack traces are emitted
 * separately at `error` level so the per-tick summary stays compact and
 * queryable.
 */
export interface DispatcherStageError {
  readonly type: string;
  readonly message: string;
}

export interface DispatcherStageTiming {
  readonly name: string;
  readonly duration_ms: number;
  readonly halted: boolean;
  readonly counts: DispatcherStageCounts;
  readonly error?: DispatcherStageError;
}

export interface DispatcherTickSummary {
  readonly started_at: string;
  readonly finished_at: string;
  readonly duration_ms: number;
  readonly previous_started_at: string;
  readonly completed: boolean;
  readonly halt_reason: DispatcherHaltReason | null;
  readonly stages: readonly DispatcherStageTiming[];
  /**
   * Final per-tick counts, rolled up from the last stage that ran.
   * Emitted as a flat object so metric aggregations (sum/avg/percentile)
   * can target `kibana.alerting_v2.dispatcher.tick.totals.*` directly
   * without flattening the `stages[]` array (which would double-count
   * monotonic counters across stages). All keys are always present.
   */
  readonly totals: DispatcherStageCounts;
}

/**
 * Structured log meta shape for a single dispatcher tick. Lives under the
 * `kibana.alerting_v2.dispatcher.tick` namespace so consumers (ES|QL, Logs
 * app) can target a stable, unambiguous key without colliding with ECS.
 */
export interface DispatcherTickLogMeta extends LogMeta {
  kibana: {
    alerting_v2: {
      dispatcher: {
        tick: DispatcherTickSummary;
      };
    };
  };
}
