/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHANGE_OVER_RANGE_MEASUREMENT,
  areMetricAggsEquivalent,
  getMetricMeasurementClass,
} from './metric_measurement';
import type { DynamicMetricAgg } from './dynamic_block_schema';

const SINGLETONS: DynamicMetricAgg[] = [
  'avg',
  'min',
  'max',
  'sum',
  'count',
  'count_distinct',
  'last',
  'sum_rate',
  'max_rate',
  'avg_rate',
  'min_rate',
];

describe('metric measurement classes', () => {
  it('puts sum_increase and sum_delta in change_over_range', () => {
    expect(getMetricMeasurementClass('sum_increase')).toBe(CHANGE_OVER_RANGE_MEASUREMENT);
    expect(getMetricMeasurementClass('sum_delta')).toBe(CHANGE_OVER_RANGE_MEASUREMENT);
    expect(areMetricAggsEquivalent('sum_increase', 'sum_delta')).toBe(true);
    expect(areMetricAggsEquivalent('sum_delta', 'sum_increase')).toBe(true);
  });

  it.each(SINGLETONS)('%s is only equivalent to itself', (agg) => {
    expect(getMetricMeasurementClass(agg)).toBe(agg);
    expect(areMetricAggsEquivalent(agg, agg)).toBe(true);
    expect(areMetricAggsEquivalent(agg, 'sum_increase')).toBe(false);
    expect(areMetricAggsEquivalent(agg, 'sum_delta')).toBe(false);
  });

  it('rejects mean vs max and rate outer mismatches', () => {
    expect(areMetricAggsEquivalent('avg', 'max')).toBe(false);
    expect(areMetricAggsEquivalent('min', 'max')).toBe(false);
    expect(areMetricAggsEquivalent('sum_rate', 'max_rate')).toBe(false);
    expect(areMetricAggsEquivalent('avg', 'last')).toBe(false);
    expect(areMetricAggsEquivalent('sum_rate', 'last')).toBe(false);
  });
});
