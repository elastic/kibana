/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { asDuration, getDurationUnit } from '../duration';

describe('duration formatters', () => {
  describe('asDuration', () => {
    it('formats correctly with defaults', () => {
      expect(asDuration(null)).toEqual('N/A');
      expect(asDuration(undefined)).toEqual('N/A');
      expect(asDuration(0)).toEqual('0 μs');
      expect(asDuration(1)).toEqual('1 μs');
      expect(asDuration(1000)).toEqual('1,000 μs');
      expect(asDuration(1000 * 1000)).toEqual('1,000 ms');
      expect(asDuration(1000 * 1000 * 10)).toEqual('10,000 ms');
      expect(asDuration(1000 * 1000 * 20)).toEqual('20.0 s');
      expect(asDuration(60000000 * 10)).toEqual('10.0 min');
      expect(asDuration(3600000000 * 1.5)).toEqual('1.5 h');
    });

    it('formats without unit', () => {
      expect(asDuration(1000, { withUnit: false })).toEqual('1,000');
    });

    it('falls back to default value', () => {
      expect(asDuration(undefined, { defaultValue: 'nope' })).toEqual('nope');
    });
  });
  describe('getDurationUnit', () => {
    test('should return right duration unit', () => {
      expect(getDurationUnit(3600000001)).toEqual('h');
      expect(getDurationUnit(3600000000)).toEqual('m');
      expect(getDurationUnit(60000001)).toEqual('m');
      expect(getDurationUnit(60000000)).toEqual('s');
      expect(getDurationUnit(10 * 1000000 + 1)).toEqual('s');
      expect(getDurationUnit(10 * 1000000)).toEqual('ms');
      expect(getDurationUnit(10 * 1000 + 1)).toEqual('ms');
      expect(getDurationUnit(10 * 1000)).toEqual('us');
      expect(getDurationUnit(10)).toEqual('us');
    });
  });
});
