/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration, DurationUnit } from './duration';

describe('Duration', () => {
  it('throws when value is negative', () => {
    expect(() => new Duration(-1, DurationUnit.Day)).toThrow('invalid duration value');
  });

  it('throws when value is zero', () => {
    expect(() => new Duration(0, DurationUnit.Day)).toThrow('invalid duration value');
  });

  it('throws when unit is not valid', () => {
    expect(() => new Duration(1, 'z' as DurationUnit)).toThrow('invalid duration unit');
  });

  describe('format', () => {
    it('formats the duration correctly', () => {
      expect(new Duration(1, DurationUnit.Minute).format()).toBe('1m');
      expect(new Duration(1, DurationUnit.Hour).format()).toBe('1h');
      expect(new Duration(1, DurationUnit.Day).format()).toBe('1d');
      expect(new Duration(1, DurationUnit.Week).format()).toBe('1w');
      expect(new Duration(1, DurationUnit.Month).format()).toBe('1M');
    });
  });

  describe('isShorterThan', () => {
    it('returns true when the current duration is shorter than the other duration', () => {
      const short = new Duration(1, DurationUnit.Minute);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Hour))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Day))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Week))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Month))).toBe(true);
    });

    it('returns false when the current duration is longer (or equal) than the other duration', () => {
      const long = new Duration(1, DurationUnit.Month);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Minute))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Hour))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Day))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Week))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Month))).toBe(false);
    });
  });

  describe('isLongerOrEqualThan', () => {
    it('returns true when the current duration is longer or equal than the other duration', () => {
      const long = new Duration(2, DurationUnit.Month);
      expect(long.isLongerOrEqualThan(new Duration(1, DurationUnit.Hour))).toBe(true);
      expect(long.isLongerOrEqualThan(new Duration(1, DurationUnit.Day))).toBe(true);
      expect(long.isLongerOrEqualThan(new Duration(1, DurationUnit.Week))).toBe(true);
      expect(long.isLongerOrEqualThan(new Duration(1, DurationUnit.Month))).toBe(true);
    });

    it('returns false when the current duration is shorter than the other duration', () => {
      const short = new Duration(1, DurationUnit.Minute);
      expect(short.isLongerOrEqualThan(new Duration(1, DurationUnit.Minute))).toBe(true);
      expect(short.isLongerOrEqualThan(new Duration(1, DurationUnit.Hour))).toBe(false);
      expect(short.isLongerOrEqualThan(new Duration(1, DurationUnit.Day))).toBe(false);
      expect(short.isLongerOrEqualThan(new Duration(1, DurationUnit.Week))).toBe(false);
      expect(short.isLongerOrEqualThan(new Duration(1, DurationUnit.Month))).toBe(false);
    });
  });

  describe('add', () => {
    it('returns the duration result in minute', () => {
      const someDuration = new Duration(1, DurationUnit.Minute);
      expect(someDuration.add(new Duration(1, DurationUnit.Minute))).toEqual(
        new Duration(2, DurationUnit.Minute)
      );
      expect(someDuration.add(new Duration(1, DurationUnit.Hour))).toEqual(
        new Duration(61, DurationUnit.Minute)
      );
      expect(someDuration.add(new Duration(1, DurationUnit.Day))).toEqual(
        new Duration(1441, DurationUnit.Minute)
      );
      expect(someDuration.add(new Duration(1, DurationUnit.Week))).toEqual(
        new Duration(10081, DurationUnit.Minute)
      );
      expect(someDuration.add(new Duration(1, DurationUnit.Month))).toEqual(
        new Duration(43201, DurationUnit.Minute)
      );
    });
  });
});
