/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-execution telemetry sinks exposed on the {@link ExecutionContext}.
 *
 * Services receive only the slice they need (Interface Segregation Principle).
 * The concrete collector that implements all of these lives in
 * `lib/rule_executor/metrics/`. This file intentionally stays free of
 * rule-executor concepts so that services in `lib/services/*` can depend on the
 * recorders without taking a dependency on the rule executor.
 */

export type AlertEventStatusKind = 'breached' | 'recovered' | 'no_data';

export type EpisodeTransitionKind = 'active' | 'recovering' | 'inactive';

export type RecoveryMode = 'no_breach' | 'query';

export type CancellationReason = 'cancelled_timeout';

export interface RecordSearchInput {
  /** ES `took` value (ms). */
  esTookMs: number;
  /** Wall-clock time spent in the query call (ms). */
  durationMs: number;
  /** Number of rows returned by the search (or batch). */
  rowCount: number;
}

export interface QueryMetricsRecorder {
  recordSearch(input: RecordSearchInput): void;
  recordBatch(): void;
}

export interface RecoveryMetricsRecorder {
  recordRecoveryMode(mode: RecoveryMode): void;
  recordRecoveryEvent(): void;
}

export interface DirectorMetricsRecorder {
  recordEpisodeTransition(kind: EpisodeTransitionKind): void;
}

export interface StorageMetricsRecorder {
  recordEventWritten(kind: AlertEventStatusKind): void;
}

export interface CancellationRecorder {
  recordCancellation(input: { step: string; reason: CancellationReason }): void;
}

/**
 * Aggregate of all per-execution recorders attached to the
 * {@link ExecutionContext}. The execution context exposes this bag so that
 * services and middleware can record telemetry without knowing about the
 * concrete collector.
 */
export interface ExecutionMetricsRecorders {
  readonly query: QueryMetricsRecorder;
  readonly recovery: RecoveryMetricsRecorder;
  readonly director: DirectorMetricsRecorder;
  readonly storage: StorageMetricsRecorder;
  readonly cancellation: CancellationRecorder;
}

/**
 * No-op recorders. Used by `createExecutionContext` when the caller does not
 * supply a metrics bag (e.g. unit tests or services constructed outside the
 * rule executor pipeline).
 */
export const noopExecutionMetricsRecorders: ExecutionMetricsRecorders = Object.freeze({
  query: Object.freeze({
    recordSearch: () => {},
    recordBatch: () => {},
  }),
  recovery: Object.freeze({
    recordRecoveryMode: () => {},
    recordRecoveryEvent: () => {},
  }),
  director: Object.freeze({
    recordEpisodeTransition: () => {},
  }),
  storage: Object.freeze({
    recordEventWritten: () => {},
  }),
  cancellation: Object.freeze({
    recordCancellation: () => {},
  }),
});
