/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricCounterService } from './metric_counter_service';

describe('MetricCounterService', () => {
  test('should correctly initialize', () => {
    const counterService = new MetricCounterService(['success', 'total']);
    expect(counterService.collect()).toEqual({ success: 0, total: 0 });
  });

  test('should correctly initialize with initial namespace', () => {
    const counterService = new MetricCounterService(['success', 'total'], 'overall');
    expect(counterService.collect()).toEqual({ overall: { success: 0, total: 0 } });
  });

  test('should correctly initialize with initial flattened namespace', () => {
    const counterService = new MetricCounterService(['success', 'total'], 'overall.count');
    expect(counterService.collect()).toEqual({ overall: { count: { success: 0, total: 0 } } });
  });

  test('should throw error if no keys provided', () => {
    expect(() => {
      new MetricCounterService([]);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Metrics counter service must be initialized with at least one key"`
    );
  });

  test('should correctly return initialMetrics', () => {
    const counterService = new MetricCounterService(['success', 'total']);
    expect(counterService.initialMetrics()).toEqual({ success: 0, total: 0 });
  });

  test('should correctly increment counter', () => {
    const counterService = new MetricCounterService(['success', 'total']);
    counterService.increment('success');
    counterService.increment('success');
    expect(counterService.collect()).toEqual({ success: 2, total: 0 });
  });

  test('should correctly increment counter for new namespace', () => {
    const counterService = new MetricCounterService(['success', 'total'], 'overall');
    counterService.increment('success', 'foo');
    expect(counterService.collect()).toEqual({
      overall: { success: 0, total: 0 },
      foo: { success: 1, total: 0 },
    });
  });

  test('should correctly increment counter for nested namespace', () => {
    const counterService = new MetricCounterService(['success', 'total'], 'overall');
    counterService.increment('success', 'foo.bar');
    counterService.increment('total', 'foo.baz');
    expect(counterService.collect()).toEqual({
      overall: { success: 0, total: 0 },
      foo: { bar: { success: 1, total: 0 }, baz: { success: 0, total: 1 } },
    });
  });

  test('should correctly reset counter', () => {
    const counterService = new MetricCounterService(['success', 'total'], 'overall');
    counterService.increment('success', 'overall');
    counterService.increment('total', 'overall');
    counterService.increment('success', 'foo.bar');
    counterService.increment('success', 'foo.bar');
    counterService.increment('total', 'foo.bar');
    counterService.increment('total', 'foo.bar');
    counterService.increment('total', 'foo.bar');
    counterService.increment('total', 'foo.bar');
    counterService.increment('total', 'foo.baz');
    counterService.increment('success', 'foo.cheese.whiz');
    expect(counterService.collect()).toEqual({
      overall: { success: 1, total: 1 },
      foo: {
        bar: { success: 2, total: 4 },
        baz: { success: 0, total: 1 },
        cheese: { whiz: { success: 1, total: 0 } },
      },
    });

    counterService.reset();
    expect(counterService.collect()).toEqual({
      overall: { success: 0, total: 0 },
      foo: {
        bar: { success: 0, total: 0 },
        baz: { success: 0, total: 0 },
        cheese: { whiz: { success: 0, total: 0 } },
      },
    });
  });
});
