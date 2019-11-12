/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
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
  const toMicros = (value: number, unit: moment.DurationInputArg2) =>
    moment.duration(value, unit).asMilliseconds() * 1000;

  describe('asDuration', () => {
    it('formats correctly with defaults', () => {
      expect(asDuration(null)).toEqual('N/A');
      expect(asDuration(undefined)).toEqual('N/A');
      expect(asDuration(0)).toEqual('0 μs');
      expect(asDuration(1)).toEqual('1 μs');
      expect(asDuration(toMicros(1, 'milliseconds'))).toEqual('1,000 μs');
      expect(asDuration(toMicros(1000, 'milliseconds'))).toEqual('1,000 ms');
      expect(asDuration(toMicros(10000, 'milliseconds'))).toEqual('10,000 ms');
      expect(asDuration(toMicros(20, 'seconds'))).toEqual('20.0 s');
      expect(asDuration(toMicros(10, 'minutes'))).toEqual('10.0 min');
      expect(asDuration(toMicros(1.5, 'hours'))).toEqual('1.5 h');
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
      expect(getDurationUnit(toMicros(1.1, 'hours'))).toEqual('h');
      expect(getDurationUnit(toMicros(1, 'hours'))).toEqual('m');
      expect(getDurationUnit(toMicros(60, 'minutes'))).toEqual('m');
      expect(getDurationUnit(toMicros(60, 'seconds'))).toEqual('s');
      expect(getDurationUnit(toMicros(100, 'milliseconds'))).toEqual('ms');
      expect(getDurationUnit(toMicros(101, 'milliseconds'))).toEqual('ms');
      expect(getDurationUnit(toMicros(10, 'milliseconds'))).toEqual('us');
      expect(getDurationUnit(10)).toEqual('us');
    });
  });

  describe('asHours', () => {
    it('should format microseconds to hours', () => {
      const oneHourAsMicro = toMicros(1, 'hours');
      const twoHourAsMicro = toMicros(2, 'hours');
      expect(asHours(oneHourAsMicro)).toEqual('1.0 h');
      expect(asHours(oneHourAsMicro, { withUnit: false })).toEqual('1.0');
      expect(asHours(twoHourAsMicro)).toEqual('2.0 h');
      expect(asHours(twoHourAsMicro, { withUnit: false })).toEqual('2.0');
      expect(asHours(null, { defaultValue: '1.2' })).toEqual('1.2');
    });
  });

  describe('asMinutes', () => {
    it('should format microseconds to minutes', () => {
      const oneHourAsMicro = toMicros(1, 'hours');
      const twoHourAsMicro = toMicros(2, 'hours');
      expect(asMinutes(oneHourAsMicro)).toEqual('60.0 min');
      expect(asMinutes(oneHourAsMicro, { withUnit: false })).toEqual('60.0');
      expect(asMinutes(twoHourAsMicro)).toEqual('120.0 min');
      expect(asMinutes(twoHourAsMicro, { withUnit: false })).toEqual('120.0');
      expect(asMinutes(null, { defaultValue: '10' })).toEqual('10');
    });
  });

  describe('asSeconds', () => {
    it('should format microseconds to seconds', () => {
      const twentySecondsAsMicro = toMicros(20, 'seconds');
      const thirtyFiveSecondsAsMicro = toMicros(35, 'seconds');
      expect(asSeconds(twentySecondsAsMicro)).toEqual('20.0 s');
      expect(asSeconds(twentySecondsAsMicro, { withUnit: false })).toEqual(
        '20.0'
      );
      expect(asSeconds(thirtyFiveSecondsAsMicro)).toEqual('35.0 s');
      expect(asSeconds(thirtyFiveSecondsAsMicro, { withUnit: false })).toEqual(
        '35.0'
      );
      expect(asSeconds(null, { defaultValue: '10' })).toEqual('10');
    });
  });
  describe('asMillis', () => {
    it('should format microseconds to milliseconds', () => {
      const twentyMilliAsMicro = toMicros(20, 'milliseconds');
      const thirtyFiveMilliAsMicro = toMicros(35, 'milliseconds');
      expect(asMillis(twentyMilliAsMicro)).toEqual('20 ms');
      expect(asMillis(twentyMilliAsMicro, { withUnit: false })).toEqual('20');
      expect(asMillis(thirtyFiveMilliAsMicro)).toEqual('35 ms');
      expect(asMillis(thirtyFiveMilliAsMicro, { withUnit: false })).toEqual(
        '35'
      );
      expect(asMillis(null, { defaultValue: '10' })).toEqual('10');
    });
  });
  describe('asMicros', () => {
    it('should format microseconds to formated microseconds', () => {
      expect(asMicros(20)).toEqual('20 μs');
      expect(asMicros(35)).toEqual('35 μs');
      expect(asMicros(20, { withUnit: false })).toEqual('20');
      expect(asMicros(35, { withUnit: false })).toEqual('35');
      expect(asMicros(null, { defaultValue: '10' })).toEqual('10');
    });
  });
});
