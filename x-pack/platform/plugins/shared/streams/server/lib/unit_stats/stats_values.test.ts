/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { perSecond, toItemRate, toValue } from './stats_values';

describe('perSecond', () => {
  it('divides the total by the seconds the data covers', () => {
    expect(perSecond(30, 180)).toBeCloseTo(0.1667, 4);
  });

  it('keeps a real zero total as zero', () => {
    expect(perSecond(0, 180)).toBe(0);
  });

  it.each([undefined, 0, -5])('is null when the covered time is %s', (seconds) => {
    expect(perSecond(30, seconds)).toBeNull();
  });
});

describe('toValue', () => {
  it('carries the unit with a value', () => {
    expect(toValue(0.107, 's')).toEqual({ value: 0.107, unit: 's' });
  });

  it('keeps the unit with a zero value', () => {
    expect(toValue(0, '{item}')).toEqual({ value: 0, unit: '{item}' });
  });

  it('leaves the unit null when there is no value', () => {
    expect(toValue(null, 's')).toEqual({ value: null, unit: null });
  });
});

describe('toItemRate', () => {
  it('carries the item unit and the per second time unit', () => {
    expect(toItemRate(0.5)).toEqual({ value: 0.5, unit: '{item}', time_unit: 's' });
  });

  it('leaves both units null when there is no value', () => {
    expect(toItemRate(null)).toEqual({ value: null, unit: null, time_unit: null });
  });
});
