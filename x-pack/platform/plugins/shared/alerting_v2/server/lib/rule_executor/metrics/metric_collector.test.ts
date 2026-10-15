/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricCollectorImpl } from './metric_collector';

describe('MetricCollectorImpl', () => {
  const executionId = 'execution-uuid';
  const startedAt = new Date('2025-01-01T00:00:00.000Z');
  const endedAt = new Date('2025-01-01T00:00:01.500Z');

  it('exposes executionId and startedAt as passed in the constructor', () => {
    const collector = new MetricCollectorImpl({ executionId, startedAt });

    expect(collector.executionId).toBe(executionId);
    expect(collector.startedAt).toBe(startedAt);
    expect(collector.endedAt).toBeUndefined();
  });

  it('sums counter increments across calls', () => {
    const collector = new MetricCollectorImpl({ executionId, startedAt });

    collector.increment('signalsGenerated', 3);
    collector.increment('signalsGenerated', 2);
    collector.increment('ruleEventsGenerated');

    const snapshot = collector.snapshot();

    expect(snapshot.counters).toEqual({
      signalsGenerated: 5,
      ruleEventsGenerated: 1,
    });
  });

  it('defaults the increment amount to 1', () => {
    const collector = new MetricCollectorImpl({ executionId, startedAt });

    collector.increment('signalsGenerated');
    collector.increment('signalsGenerated');

    expect(collector.snapshot().counters).toEqual({ signalsGenerated: 2 });
  });

  it('ignores non-finite increments', () => {
    const collector = new MetricCollectorImpl({ executionId, startedAt });

    collector.increment('signalsGenerated', Number.NaN);
    collector.increment('signalsGenerated', Number.POSITIVE_INFINITY);
    collector.increment('signalsGenerated', 4);

    expect(collector.snapshot().counters).toEqual({ signalsGenerated: 4 });
  });

  it('finalizes with the provided endedAt and computes duration', () => {
    const collector = new MetricCollectorImpl({ executionId, startedAt });

    collector.increment('signalsGenerated', 2);
    const snapshot = collector.finalize(endedAt);

    expect(snapshot).toEqual({
      executionId,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: 1500,
      counters: { signalsGenerated: 2 },
    });
    expect(collector.endedAt).toEqual(endedAt);
  });

  it('returns the same snapshot on repeated finalize calls (idempotent)', () => {
    const collector = new MetricCollectorImpl({ executionId, startedAt });
    collector.increment('signalsGenerated', 1);

    const first = collector.finalize(endedAt);
    collector.increment('signalsGenerated', 999);
    const second = collector.finalize(new Date('2030-01-01T00:00:00.000Z'));

    expect(second).toBe(first);
    expect(first.counters).toEqual({ signalsGenerated: 1 });
  });

  it('ignores increments after finalize', () => {
    const collector = new MetricCollectorImpl({ executionId, startedAt });

    collector.finalize(endedAt);
    collector.increment('signalsGenerated', 42);

    expect(collector.snapshot().counters).toEqual({});
  });

  it('produces zero duration when endedAt is before startedAt', () => {
    const collector = new MetricCollectorImpl({ executionId, startedAt });

    const snapshot = collector.finalize(new Date(startedAt.getTime() - 1000));

    expect(snapshot.durationMs).toBe(0);
  });
});
