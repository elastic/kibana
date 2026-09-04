/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asOk } from '../lib/result_type';
import type { TaskManagerBackpressureStats } from '../task_events';
import { asTaskManagerBackpressureEvent } from '../task_events';
import { TaskBackpressureMetricsAggregator } from './task_backpressure_metrics_aggregator';

const backpressureEvent = (overrides: Partial<TaskManagerBackpressureStats> = {}) =>
  asTaskManagerBackpressureEvent(
    asOk({
      active: true,
      reason: 'too_many_requests',
      ...overrides,
    })
  );

describe('TaskBackpressureMetricsAggregator', () => {
  let aggregator: TaskBackpressureMetricsAggregator;
  beforeEach(() => {
    aggregator = new TaskBackpressureMetricsAggregator();
  });

  test('should correctly initialize as inactive', () => {
    expect(aggregator.initialMetric()).toEqual({
      active: 0,
      reason: null,
    });
    expect(aggregator.collect()).toEqual(aggregator.initialMetric());
  });

  test('should map an active backpressure event, serializing active as 1', () => {
    aggregator.processTaskLifecycleEvent(backpressureEvent());
    expect(aggregator.collect()).toEqual({
      active: 1,
      reason: 'too_many_requests',
    });
  });

  test('should map an inactive backpressure event with a null reason', () => {
    aggregator.processTaskLifecycleEvent(backpressureEvent());
    aggregator.processTaskLifecycleEvent(backpressureEvent({ active: false, reason: null }));
    expect(aggregator.collect()).toEqual({
      active: 0,
      reason: null,
    });
  });

  test('should carry the cluster_block reason through', () => {
    aggregator.processTaskLifecycleEvent(
      backpressureEvent({ active: true, reason: 'cluster_block' })
    );
    expect(aggregator.collect()).toEqual({
      active: 1,
      reason: 'cluster_block',
    });
  });

  test('reset should preserve the point-in-time snapshot (not a counter)', () => {
    aggregator.processTaskLifecycleEvent(backpressureEvent());
    const beforeReset = aggregator.collect();
    aggregator.reset();
    expect(aggregator.collect()).toEqual(beforeReset);
    expect(aggregator.collect().active).toBe(1);
  });
});
