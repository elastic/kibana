/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSampleProbability } from './get_sample_probability';

describe('getSampleProbability', () => {
  test('returns sample probability of 1 for docs up to required minimum doc count', () => {
    expect(getSampleProbability(0)).toEqual(1);
    expect(getSampleProbability(1)).toEqual(1);
    expect(getSampleProbability(10)).toEqual(1);
    expect(getSampleProbability(100)).toEqual(1);
    expect(getSampleProbability(1000)).toEqual(1);
    expect(getSampleProbability(10000)).toEqual(1);
    expect(getSampleProbability(50000)).toEqual(1);
  });
  test('returns sample probability of 0.5 for docs in range 50001-100000', () => {
    expect(getSampleProbability(50001)).toEqual(0.5);
    expect(getSampleProbability(100000)).toEqual(0.5);
  });
  test('returns sample probability based on total docs ratio', () => {
    expect(getSampleProbability(100001)).toEqual(0.4999950000499995);
    expect(getSampleProbability(1000000)).toEqual(0.05);
    expect(getSampleProbability(1000001)).toEqual(0.04999995000005);
    expect(getSampleProbability(2000000)).toEqual(0.025);
    expect(getSampleProbability(5000000)).toEqual(0.01);
    expect(getSampleProbability(10000000)).toEqual(0.005);
    expect(getSampleProbability(100000000)).toEqual(0.0005);
    expect(getSampleProbability(1000000000)).toEqual(0.00005);
    expect(getSampleProbability(10000000000)).toEqual(0.000005);
  });
});
