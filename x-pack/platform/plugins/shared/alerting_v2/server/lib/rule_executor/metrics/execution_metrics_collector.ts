/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertEventStatusKind,
  CancellationReason,
  EpisodeTransitionKind,
  ExecutionMetricsRecorders,
  RecordSearchInput,
  RecoveryMode,
} from '../../execution_context';
import type { ExecutionMetricsCollectorContract, ExecutionMetricsSnapshot } from './types';

interface QueryCounters {
  numberOfSearches: number;
  esSearchDurationMs: number;
  totalSearchDurationMs: number;
  numberOfRowsReturned: number;
  numberOfBatches: number;
}

interface EventsWrittenCounters {
  breached: number;
  recovered: number;
  no_data: number;
}

interface EpisodeCounters {
  active: number;
  recovering: number;
  inactive: number;
}

interface RecoveryCounters {
  mode?: RecoveryMode;
  eventsEmitted: number;
}

interface CancellationState {
  step: string;
  reason: CancellationReason;
}

/**
 * Per-execution metrics sink.
 *
 * Implements all the role-segregated recorder interfaces from
 * `lib/execution_context/metrics_recorders.ts` and exposes a single
 * `snapshot()` accessor that returns the RFC-shaped metrics tree.
 *
 * The collector has no knowledge of the event_log plugin or any other
 * downstream consumer — it is pure data. The
 * `TelemetryRecorderDecorator` reads the snapshot after the pipeline
 * completes and turns it into an event-log document.
 */
export class ExecutionMetricsCollector implements ExecutionMetricsCollectorContract {
  private readonly query: QueryCounters = {
    numberOfSearches: 0,
    esSearchDurationMs: 0,
    totalSearchDurationMs: 0,
    numberOfRowsReturned: 0,
    numberOfBatches: 0,
  };

  private readonly eventsWritten: EventsWrittenCounters = {
    breached: 0,
    recovered: 0,
    no_data: 0,
  };

  private readonly episodes: EpisodeCounters = {
    active: 0,
    recovering: 0,
    inactive: 0,
  };

  private readonly recovery: RecoveryCounters = {
    eventsEmitted: 0,
  };

  private cancellation: CancellationState | undefined;

  public readonly recorders: ExecutionMetricsRecorders = {
    query: {
      recordSearch: ({ esTookMs, durationMs, rowCount }: RecordSearchInput) => {
        this.query.numberOfSearches += 1;
        this.query.esSearchDurationMs += esTookMs;
        this.query.totalSearchDurationMs += durationMs;
        this.query.numberOfRowsReturned += rowCount;
      },
      recordBatch: () => {
        this.query.numberOfBatches += 1;
      },
    },
    recovery: {
      recordRecoveryMode: (mode: RecoveryMode) => {
        this.recovery.mode = mode;
      },
      recordRecoveryEvent: () => {
        this.recovery.eventsEmitted += 1;
      },
    },
    director: {
      recordEpisodeTransition: (kind: EpisodeTransitionKind) => {
        this.episodes[kind] += 1;
      },
    },
    storage: {
      recordEventWritten: (kind: AlertEventStatusKind) => {
        this.eventsWritten[kind] += 1;
      },
    },
    cancellation: {
      recordCancellation: ({ step, reason }) => {
        // First cancellation wins: the abort always fires at the boundary of
        // the step that was running.
        if (this.cancellation == null) {
          this.cancellation = { step, reason };
        }
      },
    },
  };

  public snapshot(): ExecutionMetricsSnapshot {
    const total =
      this.eventsWritten.breached + this.eventsWritten.recovered + this.eventsWritten.no_data;

    return {
      query: {
        number_of_searches: this.query.numberOfSearches,
        es_search_duration_ms: this.query.esSearchDurationMs,
        total_search_duration_ms: this.query.totalSearchDurationMs,
        number_of_rows_returned: this.query.numberOfRowsReturned,
        number_of_batches: this.query.numberOfBatches,
      },
      events_written: {
        breached: this.eventsWritten.breached,
        recovered: this.eventsWritten.recovered,
        no_data: this.eventsWritten.no_data,
        total,
      },
      episodes: {
        transitioned_to_active: this.episodes.active,
        transitioned_to_recovering: this.episodes.recovering,
        transitioned_to_inactive: this.episodes.inactive,
      },
      recovery: {
        mode: this.recovery.mode,
        events_emitted: this.recovery.eventsEmitted,
      },
      cancelled: this.cancellation,
    };
  }
}
