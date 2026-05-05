/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionMetricsCollector } from './metrics_collector';

describe('RuleExecutionMetricsCollector', () => {
  it('returns an empty snapshot when nothing has been recorded', () => {
    const collector = new RuleExecutionMetricsCollector();
    expect(collector.snapshot()).toEqual({});
  });

  it('aggregates query searches across multiple calls', () => {
    const collector = new RuleExecutionMetricsCollector();
    collector.recordQuerySearch({ wallTimeMs: 100, rowCount: 10, batchCount: 1 });
    collector.recordQuerySearch({ wallTimeMs: 50, rowCount: 5, batchCount: 1, esTookMs: 12 });
    collector.recordQuerySearch({ wallTimeMs: 25, rowCount: 0, batchCount: 0, esTookMs: 3 });

    expect(collector.snapshot().query).toEqual({
      number_of_searches: 3,
      total_search_duration_ms: 175,
      number_of_rows_returned: 15,
      number_of_batches: 2,
      es_search_duration_ms: 15,
    });
  });

  it('omits es_search_duration_ms when no sample provides it', () => {
    const collector = new RuleExecutionMetricsCollector();
    collector.recordQuerySearch({ wallTimeMs: 100, rowCount: 10, batchCount: 1 });

    expect(collector.snapshot().query?.es_search_duration_ms).toBeUndefined();
  });

  it('aggregates events_written and computes total', () => {
    const collector = new RuleExecutionMetricsCollector();
    collector.recordEventsWritten({ breached: 3, recovered: 1 });
    collector.recordEventsWritten({ no_data: 2, breached: 1 });

    expect(collector.snapshot().events_written).toEqual({
      breached: 4,
      recovered: 1,
      no_data: 2,
      total: 7,
    });
  });

  it('aggregates episode transitions', () => {
    const collector = new RuleExecutionMetricsCollector();
    collector.recordEpisodesTransitioned({ active: 2, recovering: 1 });
    collector.recordEpisodesTransitioned({ inactive: 4, active: 1 });

    expect(collector.snapshot().episodes).toEqual({
      transitioned_to_active: 3,
      transitioned_to_recovering: 1,
      transitioned_to_inactive: 4,
    });
  });

  it('keeps the most recent recovery sample', () => {
    const collector = new RuleExecutionMetricsCollector();
    collector.recordRecovery({ mode: 'no_breach', events_emitted: 1 });
    collector.recordRecovery({ mode: 'query', events_emitted: 5 });

    expect(collector.snapshot().recovery).toEqual({ mode: 'query', events_emitted: 5 });
  });

  it('omits categories that received no samples', () => {
    const collector = new RuleExecutionMetricsCollector();
    collector.recordEventsWritten({ breached: 2 });

    const snapshot = collector.snapshot();
    expect(snapshot.events_written).toBeDefined();
    expect(snapshot.query).toBeUndefined();
    expect(snapshot.episodes).toBeUndefined();
    expect(snapshot.recovery).toBeUndefined();
  });
});
