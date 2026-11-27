/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitTimeValue, timeValueToMs } from './time_value';

describe('splitTimeValue', () => {
  it.each([
    ['7d', { size: 7, unit: 'd' }],
    ['1.5h', { size: 1.5, unit: 'h' }],
    ['10nanos', { size: 10, unit: 'nanos' }],
    ['-1', { size: -1, unit: '' }],
  ])('splits %s', (value, expected) => {
    expect(splitTimeValue(value)).toEqual(expected);
  });

  it('reads nothing else', () => {
    expect(splitTimeValue('')).toBeUndefined();
    expect(splitTimeValue('7 days')).toBeUndefined();
  });
});

describe('timeValueToMs', () => {
  it.each([
    ['7d', 604_800_000],
    ['12h', 43_200_000],
    ['90m', 5_400_000],
    ['60s', 60_000],
    ['1500ms', 1_500],
    ['-1', -1],
    ['0ms', 0],
  ])('reads %s', (value, expected) => {
    expect(timeValueToMs(value)).toBe(expected);
  });

  it('is NaN for units it does not know', () => {
    expect(timeValueToMs('7w')).toBeNaN();
    expect(timeValueToMs('')).toBeNaN();
  });
});
