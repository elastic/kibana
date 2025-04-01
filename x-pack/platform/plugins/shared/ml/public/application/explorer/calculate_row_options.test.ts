/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateRowOptions } from './calculate_row_options';

describe('calculateRowOptions', () => {
  it('should return all options when cardinality is greater than all row options', () => {
    const rowOptions = [5, 10, 20, 50, 100];
    const cardinality = 150;
    expect(calculateRowOptions(rowOptions, cardinality)).toEqual([5, 10, 20, 50, 100]);
  });

  it('should return options up to and including cardinality', () => {
    const rowOptions = [5, 10, 20, 50, 100];
    const cardinality = 30;
    expect(calculateRowOptions(rowOptions, cardinality)).toEqual([5, 10, 20, 50]);
  });

  it('should return at least one option even if cardinality is less than all options', () => {
    const rowOptions = [5, 10, 20, 50, 100];
    const cardinality = 3;
    expect(calculateRowOptions(rowOptions, cardinality)).toEqual([5]);
  });

  it('should handle cardinality of zero', () => {
    const rowOptions = [5, 10, 20, 50, 100];
    const cardinality = 0;
    expect(calculateRowOptions(rowOptions, cardinality)).toEqual([5]);
  });
});
