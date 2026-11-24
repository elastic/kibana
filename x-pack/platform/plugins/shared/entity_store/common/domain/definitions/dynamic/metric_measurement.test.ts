/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUMULATIVE_COUNT_MEASUREMENT,
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
  'max_rate',
  'avg_rate',
  'min_rate',
];

describe('metric measurement classes', () => {
  it('puts sum_rate and last in cumulative_count', () => {
    expect(getMetricMeasurementClass('sum_rate')).toBe(CUMULATIVE_COUNT_MEASUREMENT);
    expect(getMetricMeasurementClass('last')).toBe(CUMULATIVE_COUNT_MEASUREMENT);
    expect(areMetricAggsEquivalent('sum_rate', 'last')).toBe(true);
    expect(areMetricAggsEquivalent('last', 'sum_rate')).toBe(true);
  });

  it.each(SINGLETONS)('%s is only equivalent to itself', (agg) => {
    expect(getMetricMeasurementClass(agg)).toBe(agg);
    expect(areMetricAggsEquivalent(agg, agg)).toBe(true);
    expect(areMetricAggsEquivalent(agg, 'last')).toBe(false);
    expect(areMetricAggsEquivalent(agg, 'sum_rate')).toBe(false);
  });

  it('rejects mean vs max and rate outer mismatches', () => {
    expect(areMetricAggsEquivalent('avg', 'max')).toBe(false);
    expect(areMetricAggsEquivalent('min', 'max')).toBe(false);
    expect(areMetricAggsEquivalent('sum_rate', 'max_rate')).toBe(false);
    expect(areMetricAggsEquivalent('avg', 'last')).toBe(false);
  });
});
