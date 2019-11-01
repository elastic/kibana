/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  asDuration,
  getDurationUnit,
  asHours,
  asMinutes,
  asSeconds,
  asMillis,
  asMicros
} from '../duration';

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

  describe('asHours', () => {
    it('should format microseconds to hours', () => {
      expect(asHours(3600000000)).toEqual('1.0 h');
      expect(asHours(7200000000)).toEqual('2.0 h');
      expect(asHours(3600000000, { withUnit: false })).toEqual('1.0');
      expect(asHours(7200000000, { withUnit: false })).toEqual('2.0');
      expect(asHours(null, { defaultValue: '1.2' })).toEqual('1.2');
    });
  });

  describe('asMinutes', () => {
    it('should format microseconds to asMinutes', () => {
      expect(asMinutes(3600000000)).toEqual('60.0 min');
      expect(asMinutes(7200000000)).toEqual('120.0 min');
      expect(asMinutes(3600000000, { withUnit: false })).toEqual('60.0');
      expect(asMinutes(7200000000, { withUnit: false })).toEqual('120.0');
      expect(asMinutes(null, { defaultValue: '10' })).toEqual('10');
    });
  });

  describe('asSeconds', () => {
    it('should format microseconds to asMinutes', () => {
      expect(asSeconds(20000000)).toEqual('20.0 s');
      expect(asSeconds(35000000)).toEqual('35.0 s');
      expect(asSeconds(20000000, { withUnit: false })).toEqual('20.0');
      expect(asSeconds(35000000, { withUnit: false })).toEqual('35.0');
      expect(asSeconds(null, { defaultValue: '10' })).toEqual('10');
    });
  });
  describe('asMillis', () => {
    it('should format microseconds to asMinutes', () => {
      expect(asMillis(20000)).toEqual('20 ms');
      expect(asMillis(35000)).toEqual('35 ms');
      expect(asMillis(20000, { withUnit: false })).toEqual('20');
      expect(asMillis(35000, { withUnit: false })).toEqual('35');
      expect(asMillis(null, { defaultValue: '10' })).toEqual('10');
    });
  });
  describe('asMicros', () => {
    it('should format microseconds to asMinutes', () => {
      expect(asMicros(20)).toEqual('20 μs');
      expect(asMicros(35)).toEqual('35 μs');
      expect(asMicros(20, { withUnit: false })).toEqual('20');
      expect(asMicros(35, { withUnit: false })).toEqual('35');
      expect(asMicros(null, { defaultValue: '10' })).toEqual('10');
    });
  });
});
