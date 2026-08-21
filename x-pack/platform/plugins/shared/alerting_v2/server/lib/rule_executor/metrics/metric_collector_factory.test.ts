/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricCollectorFactory } from './metric_collector_factory';

describe('MetricCollectorFactory', () => {
  it('creates a collector with the caller-supplied executionId', () => {
    const factory = new MetricCollectorFactory();

    const collector = factory.create({ executionId: 'tm-execution-uuid' });

    expect(collector.executionId).toBe('tm-execution-uuid');
  });

  it('sources startedAt from the `now` seam', () => {
    const startedAt = new Date('2025-01-01T00:00:00.000Z');
    const factory = new MetricCollectorFactory({ now: () => startedAt });

    const collector = factory.create({ executionId: 'fixed-id' });

    expect(collector.startedAt).toBe(startedAt);
  });

  it('returns a fresh collector for every call, honouring each executionId', () => {
    let tick = 0;
    const factory = new MetricCollectorFactory({ now: () => new Date(++tick * 1000) });

    const first = factory.create({ executionId: 'id-1' });
    const second = factory.create({ executionId: 'id-2' });

    expect(first).not.toBe(second);
    expect(first.executionId).toBe('id-1');
    expect(second.executionId).toBe('id-2');
    expect(first.startedAt).not.toEqual(second.startedAt);
  });

  it('uses Date by default for startedAt', () => {
    const factory = new MetricCollectorFactory();

    const collector = factory.create({ executionId: 'id' });

    expect(collector.startedAt).toBeInstanceOf(Date);
  });
});
