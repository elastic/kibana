/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSafeAggregationName } from './get_safe_aggregation_name';

describe('getSafeAggregationName', () => {
  test('"foo" should be "foo"', () => {
    expect(getSafeAggregationName('foo', 0)).toBe('foo');
  });
  test('"foo.bar" should be "foo.bar"', () => {
    expect(getSafeAggregationName('foo.bar', 0)).toBe('foo.bar');
  });
  test('"foo&bar" should be "field_0"', () => {
    expect(getSafeAggregationName('foo&bar', 0)).toBe('field_0');
  });
});
