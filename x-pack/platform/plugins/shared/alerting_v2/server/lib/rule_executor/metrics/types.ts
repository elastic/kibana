/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CancellationReason, RecoveryMode } from '../events';

/**
 * Immutable, RFC-shaped snapshot returned by
 * {@link ExecutionMetricsCollectorContract.snapshot}.
 *
 * Mirrors `kibana.alerting_v2.rule_executor.execution.metrics.*` from the
 * RFC document schema, plus the sibling `cancelled` channel.
 */
export interface ExecutionMetricsSnapshot {
  readonly query: {
    readonly number_of_searches: number;
    readonly es_search_duration_ms: number;
    readonly total_search_duration_ms: number;
    readonly number_of_rows_returned: number;
    readonly number_of_batches: number;
  };
  readonly events_written: {
    readonly breached: number;
    readonly recovered: number;
    readonly no_data: number;
    readonly total: number;
  };
  readonly episodes: {
    readonly transitioned_to_active: number;
    readonly transitioned_to_recovering: number;
    readonly transitioned_to_inactive: number;
  };
  readonly recovery: {
    readonly mode?: RecoveryMode;
    readonly events_emitted: number;
  };
  readonly cancelled?: {
    readonly step: string;
    readonly reason: CancellationReason;
  };
}

/**
 * Public contract of the execution metrics collector.
 *
 * Exposes `snapshot()` for the `TelemetryObserver` to read at the end of a
 * run. Counter writes happen through the concrete collector's `record*`
 * methods (kept off the contract so consumers are obviously read-only).
 */
export interface ExecutionMetricsCollectorContract {
  snapshot(): ExecutionMetricsSnapshot;
}
