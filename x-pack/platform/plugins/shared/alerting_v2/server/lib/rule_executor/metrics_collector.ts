/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecoveryPolicyType } from '@kbn/alerting-v2-schemas';

export interface QuerySearchSample {
  readonly wallTimeMs: number;
  readonly esTookMs?: number;
  readonly rowCount: number;
  readonly batchCount: number;
}

export interface EventsWrittenSample {
  readonly breached?: number;
  readonly recovered?: number;
  readonly no_data?: number;
}

export interface EpisodesTransitionedSample {
  readonly active?: number;
  readonly recovering?: number;
  readonly inactive?: number;
}

export interface RecoverySample {
  readonly mode: RecoveryPolicyType;
  readonly events_emitted: number;
}

export interface RuleExecutionMetricsSnapshot {
  query?: {
    number_of_searches: number;
    es_search_duration_ms?: number;
    total_search_duration_ms: number;
    number_of_rows_returned: number;
    number_of_batches: number;
  };
  events_written?: {
    breached: number;
    recovered: number;
    no_data: number;
    total: number;
  };
  episodes?: {
    transitioned_to_active: number;
    transitioned_to_recovering: number;
    transitioned_to_inactive: number;
  };
  recovery?: {
    mode: RecoveryPolicyType;
    events_emitted: number;
  };
}

export interface RuleExecutionMetricsCollectorContract {
  recordQuerySearch(sample: QuerySearchSample): void;
  recordEventsWritten(sample: EventsWrittenSample): void;
  recordEpisodesTransitioned(sample: EpisodesTransitionedSample): void;
  recordRecovery(sample: RecoverySample): void;
  snapshot(): RuleExecutionMetricsSnapshot;
}

/**
 * Per-execution accumulator for the values exposed under
 * `kibana.alerting_v2.rule_executor.execution.metrics.*` in the RFC.
 *
 * Categories are reported only when at least one sample arrived — so a
 * signal-kind rule that never runs the director step doesn't report a
 * zero-filled `episodes` block, which would be misleading.
 */
export class RuleExecutionMetricsCollector implements RuleExecutionMetricsCollectorContract {
  private query: RuleExecutionMetricsSnapshot['query'];
  private eventsWritten: { breached: number; recovered: number; no_data: number } | undefined;
  private episodes: RuleExecutionMetricsSnapshot['episodes'];
  private recovery: RecoverySample | undefined;

  public recordQuerySearch(sample: QuerySearchSample): void {
    this.query ??= {
      number_of_searches: 0,
      total_search_duration_ms: 0,
      number_of_rows_returned: 0,
      number_of_batches: 0,
    };
    this.query.number_of_searches += 1;
    this.query.total_search_duration_ms += sample.wallTimeMs;
    this.query.number_of_rows_returned += sample.rowCount;
    this.query.number_of_batches += sample.batchCount;
    if (sample.esTookMs !== undefined) {
      this.query.es_search_duration_ms = (this.query.es_search_duration_ms ?? 0) + sample.esTookMs;
    }
  }

  public recordEventsWritten(sample: EventsWrittenSample): void {
    this.eventsWritten ??= { breached: 0, recovered: 0, no_data: 0 };
    this.eventsWritten.breached += sample.breached ?? 0;
    this.eventsWritten.recovered += sample.recovered ?? 0;
    this.eventsWritten.no_data += sample.no_data ?? 0;
  }

  public recordEpisodesTransitioned(sample: EpisodesTransitionedSample): void {
    this.episodes ??= {
      transitioned_to_active: 0,
      transitioned_to_recovering: 0,
      transitioned_to_inactive: 0,
    };
    this.episodes.transitioned_to_active += sample.active ?? 0;
    this.episodes.transitioned_to_recovering += sample.recovering ?? 0;
    this.episodes.transitioned_to_inactive += sample.inactive ?? 0;
  }

  public recordRecovery(sample: RecoverySample): void {
    this.recovery = sample;
  }

  public snapshot(): RuleExecutionMetricsSnapshot {
    return {
      ...(this.query && { query: { ...this.query } }),
      ...(this.eventsWritten && {
        events_written: {
          ...this.eventsWritten,
          total:
            this.eventsWritten.breached + this.eventsWritten.recovered + this.eventsWritten.no_data,
        },
      }),
      ...(this.episodes && { episodes: { ...this.episodes } }),
      ...(this.recovery && { recovery: { ...this.recovery } }),
    };
  }
}
