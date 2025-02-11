/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@kbn/datemath';
import moment from 'moment';
import { getAbsoluteTime, isValidDateMath } from './date';

describe('getAbsoluteTime', () => {
  let parseSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    parseSpy = jest
      .spyOn(datemath, 'parse')
      .mockImplementation((range: string, opts: { forceNow?: Date; roundUp?: boolean } = {}) => {
        switch (range) {
          case 'now/d':
            return moment(opts.roundUp ? '2025-01-20T23:59:59Z' : '2025-01-20T00:00:00Z');
          default:
            return undefined;
        }
      });
  });

  it('returns the absolute timestamp for a valid relative range (e.g., now/d)', () => {
    const startOfToday = new Date('2025-01-20T00:00:00Z').valueOf();

    const result = getAbsoluteTime('now/d');
    expect(result).toEqual(startOfToday);
  });

  it('respects the options passed to datemath.parse (e.g., roundUp)', () => {
    const endOfToday = new Date('2025-01-20T23:59:59Z').valueOf();

    const result = getAbsoluteTime('now/d', { roundUp: true });
    expect(result).toEqual(endOfToday);
  });

  it('returns undefined for an invalid range', () => {
    const result = getAbsoluteTime('invalid-range');
    expect(result).toBeUndefined();
  });

  it('handles undefined input gracefully', () => {
    const result = getAbsoluteTime('');
    expect(result).toBeUndefined();
  });

  afterEach(() => {
    parseSpy.mockRestore();
  });
});

describe('isValidDateMath', () => {
  it('Returns `false` for empty strings', () => {
    expect(isValidDateMath('')).toBe(false);
  });

  it('Returns `false` for invalid strings', () => {
    expect(isValidDateMath('wadus')).toBe(false);
    expect(isValidDateMath('nowww-')).toBe(false);
    expect(isValidDateMath('now-')).toBe(false);
    expect(isValidDateMath('now-1')).toBe(false);
    expect(isValidDateMath('now-1d/')).toBe(false);
  });

  it('Returns `true` for valid strings', () => {
    expect(isValidDateMath('now')).toBe(true);
    expect(isValidDateMath('now/d')).toBe(true);
    expect(isValidDateMath('now-1d')).toBe(true);
    expect(isValidDateMath('now-1d/d')).toBe(true);
  });
});
