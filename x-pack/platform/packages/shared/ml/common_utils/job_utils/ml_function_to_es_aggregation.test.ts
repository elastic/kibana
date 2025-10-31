/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mlFunctionToESAggregation } from './ml_function_to_es_aggregation';

describe('mlFunctionToESAggregation', () => {
  test('returns correct ES aggregation type for ML function', () => {
    expect(mlFunctionToESAggregation('count')).toBe('count');
    expect(mlFunctionToESAggregation('low_count')).toBe('count');
    expect(mlFunctionToESAggregation('high_count')).toBe('count');
    expect(mlFunctionToESAggregation('non_zero_count')).toBe('count');
    expect(mlFunctionToESAggregation('low_non_zero_count')).toBe('count');
    expect(mlFunctionToESAggregation('high_non_zero_count')).toBe('count');
    expect(mlFunctionToESAggregation('distinct_count')).toBe('cardinality');
    expect(mlFunctionToESAggregation('low_distinct_count')).toBe('cardinality');
    expect(mlFunctionToESAggregation('high_distinct_count')).toBe('cardinality');
    expect(mlFunctionToESAggregation('metric')).toBe('avg');
    expect(mlFunctionToESAggregation('mean')).toBe('avg');
    expect(mlFunctionToESAggregation('low_mean')).toBe('avg');
    expect(mlFunctionToESAggregation('high_mean')).toBe('avg');
    expect(mlFunctionToESAggregation('min')).toBe('min');
    expect(mlFunctionToESAggregation('max')).toBe('max');
    expect(mlFunctionToESAggregation('sum')).toBe('sum');
    expect(mlFunctionToESAggregation('low_sum')).toBe('sum');
    expect(mlFunctionToESAggregation('high_sum')).toBe('sum');
    expect(mlFunctionToESAggregation('non_null_sum')).toBe('sum');
    expect(mlFunctionToESAggregation('low_non_null_sum')).toBe('sum');
    expect(mlFunctionToESAggregation('high_non_null_sum')).toBe('sum');
    expect(mlFunctionToESAggregation('rare')).toBe('count');
    expect(mlFunctionToESAggregation('freq_rare')).toBe(null);
    expect(mlFunctionToESAggregation('info_content')).toBe(null);
    expect(mlFunctionToESAggregation('low_info_content')).toBe(null);
    expect(mlFunctionToESAggregation('high_info_content')).toBe(null);
    expect(mlFunctionToESAggregation('median')).toBe('percentiles');
    expect(mlFunctionToESAggregation('low_median')).toBe('percentiles');
    expect(mlFunctionToESAggregation('high_median')).toBe('percentiles');
    expect(mlFunctionToESAggregation('varp')).toBe(null);
    expect(mlFunctionToESAggregation('low_varp')).toBe(null);
    expect(mlFunctionToESAggregation('high_varp')).toBe(null);
    expect(mlFunctionToESAggregation('time_of_day')).toBe(null);
    expect(mlFunctionToESAggregation('time_of_week')).toBe(null);
    expect(mlFunctionToESAggregation('lat_long')).toBe(null);
  });
});
