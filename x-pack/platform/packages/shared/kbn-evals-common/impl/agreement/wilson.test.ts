/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intervalsOverlap, wilsonInterval } from './wilson';

describe('wilsonInterval', () => {
  // Reference values computed independently with z = 1.959963984540054.
  it.each([
    [7, 27, 0.1317037456, 0.4467857131],
    [0, 10, 0, 0.2775327999],
    [10, 10, 0.7224672001, 1],
    [45, 50, 0.7863976856, 0.9565242351],
    [20, 30, 0.4878005164, 0.8076950192],
  ])('matches the reference for %i/%i', (successes, total, low, high) => {
    const interval = wilsonInterval(successes, total);
    expect(Math.abs(interval.low - low)).toBeLessThan(1e-6);
    expect(Math.abs(interval.high - high)).toBeLessThan(1e-6);
  });

  it('is uninformative with no observations', () => {
    expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 1 });
  });

  it('narrows as the sample grows', () => {
    const small = wilsonInterval(5, 20);
    const large = wilsonInterval(50, 200);
    expect(large.high - large.low).toBeLessThan(small.high - small.low);
  });
});

describe('intervalsOverlap', () => {
  it('detects overlap and separation', () => {
    expect(intervalsOverlap(wilsonInterval(7, 27), wilsonInterval(6, 27))).toBe(true);
    expect(intervalsOverlap(wilsonInterval(10, 200), wilsonInterval(180, 200))).toBe(false);
  });
});
