/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricCollectorFactory } from './metric_collector_factory';

describe('MetricCollectorFactory', () => {
  it('creates a collector with the provided executionId and startedAt seams', () => {
    const startedAt = new Date('2025-01-01T00:00:00.000Z');
    const factory = new MetricCollectorFactory({
      generateExecutionId: () => 'fixed-id',
      now: () => startedAt,
    });

    const collector = factory.create();

    expect(collector.executionId).toBe('fixed-id');
    expect(collector.startedAt).toBe(startedAt);
  });

  it('returns a fresh collector for every call', () => {
    let counter = 0;
    const factory = new MetricCollectorFactory({
      generateExecutionId: () => `id-${++counter}`,
      now: () => new Date(counter * 1000),
    });

    const first = factory.create();
    const second = factory.create();

    expect(first).not.toBe(second);
    expect(first.executionId).toBe('id-1');
    expect(second.executionId).toBe('id-2');
  });

  it('uses uuid v4 and Date by default', () => {
    const factory = new MetricCollectorFactory();
    const collector = factory.create();

    expect(collector.executionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(collector.startedAt).toBeInstanceOf(Date);
  });
});
