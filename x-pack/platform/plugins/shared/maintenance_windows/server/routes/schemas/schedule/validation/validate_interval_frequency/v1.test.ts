/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateIntervalAndFrequency } from './v1';

describe('validateIntervalAndFrequency', () => {
  it('validates frequency in days correctly', () => {
    expect(validateIntervalAndFrequency('2d')).toBeUndefined();
  });

  it('validates frequency in weeks correctly', () => {
    expect(validateIntervalAndFrequency('5w')).toBeUndefined();
  });

  it('validates frequency in months correctly', () => {
    expect(validateIntervalAndFrequency('3M')).toBeUndefined();
  });

  it('validates frequency in years correctly', () => {
    expect(validateIntervalAndFrequency('1y')).toBeUndefined();
  });

  it('validates frequency in hours correctly', () => {
    expect(validateIntervalAndFrequency('1h')).toBeUndefined();
  });

  it('throws error when invalid frequency', () => {
    expect(validateIntervalAndFrequency('10s')).toEqual(
      `'every' string of recurring schedule is not valid : 10s`
    );
  });

  it('throws error when invalid frequency in minutes', () => {
    expect(validateIntervalAndFrequency('5m')).toEqual(
      `'every' string of recurring schedule is not valid : 5m`
    );
  });

  it('throws error when an invalid interval', () => {
    expect(validateIntervalAndFrequency('-1w')).toEqual(
      `Invalid 'every' field conversion to date.`
    );
  });

  it('throws error when invalid string', () => {
    expect(validateIntervalAndFrequency('invalid')).toEqual(
      `'every' string of recurring schedule is not valid : invalid`
    );
  });

  it('throws error when empty string with spaces', () => {
    expect(validateIntervalAndFrequency(' ')).toEqual(
      `'every' string of recurring schedule is not valid :  `
    );
  });
});
