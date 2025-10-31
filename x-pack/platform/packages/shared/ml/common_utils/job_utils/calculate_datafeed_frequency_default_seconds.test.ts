/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateDatafeedFrequencyDefaultSeconds } from './calculate_datafeed_frequency_default_seconds';

describe('calculateDatafeedFrequencyDefaultSeconds', () => {
  test('returns correct frequency for 119', () => {
    const result = calculateDatafeedFrequencyDefaultSeconds(119);
    expect(result).toBe(60);
  });
  test('returns correct frequency for 120', () => {
    const result = calculateDatafeedFrequencyDefaultSeconds(120);
    expect(result).toBe(60);
  });
  test('returns correct frequency for 300', () => {
    const result = calculateDatafeedFrequencyDefaultSeconds(300);
    expect(result).toBe(150);
  });
  test('returns correct frequency for 601', () => {
    const result = calculateDatafeedFrequencyDefaultSeconds(601);
    expect(result).toBe(300);
  });
  test('returns correct frequency for 43200', () => {
    const result = calculateDatafeedFrequencyDefaultSeconds(43200);
    expect(result).toBe(600);
  });
  test('returns correct frequency for 43201', () => {
    const result = calculateDatafeedFrequencyDefaultSeconds(43201);
    expect(result).toBe(3600);
  });
});
