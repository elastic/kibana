/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { asDuration, convertTo, toMicroseconds } from '../duration';

describe('duration formatters', () => {
  describe('asDuration', () => {
    it('formats correctly with defaults', () => {
      expect(asDuration(null)).toEqual('N/A');
      expect(asDuration(undefined)).toEqual('N/A');
      expect(asDuration(0)).toEqual('0 μs');
      expect(asDuration(1)).toEqual('1 μs');
      expect(asDuration(toMicroseconds(1, 'milliseconds'))).toEqual('1,000 μs');
      expect(asDuration(toMicroseconds(1000, 'milliseconds'))).toEqual(
        '1,000 ms'
      );
      expect(asDuration(toMicroseconds(10000, 'milliseconds'))).toEqual(
        '10,000 ms'
      );
      expect(asDuration(toMicroseconds(20, 'seconds'))).toEqual('20.0 s');
      expect(asDuration(toMicroseconds(10, 'minutes'))).toEqual('10.0 min');
      expect(asDuration(toMicroseconds(1, 'hours'))).toEqual('60.0 min');
      expect(asDuration(toMicroseconds(1.5, 'hours'))).toEqual('1.5 h');
    });

    it('falls back to default value', () => {
      expect(asDuration(undefined, { defaultValue: 'nope' })).toEqual('nope');
    });
  });

  describe('convertTo', () => {
    it('hours', () => {
      const unit = 'hours';
      const oneHourAsMicro = toMicroseconds(1, 'hours');
      const twoHourAsMicro = toMicroseconds(2, 'hours');
      expect(convertTo({ unit, microseconds: oneHourAsMicro })).toEqual({
        unit: 'h',
        value: '1.0',
        formatted: '1.0 h'
      });
      expect(convertTo({ unit, microseconds: twoHourAsMicro })).toEqual({
        unit: 'h',
        value: '2.0',
        formatted: '2.0 h'
      });
      expect(
        convertTo({ unit, microseconds: null, defaultValue: '1.2' })
      ).toEqual({ value: '1.2', formatted: '1.2' });
    });

    it('minutes', () => {
      const unit = 'minutes';
      const oneHourAsMicro = toMicroseconds(1, 'hours');
      const twoHourAsMicro = toMicroseconds(2, 'hours');
      expect(convertTo({ unit, microseconds: oneHourAsMicro })).toEqual({
        unit: 'min',
        value: '60.0',
        formatted: '60.0 min'
      });
      expect(convertTo({ unit, microseconds: twoHourAsMicro })).toEqual({
        unit: 'min',
        value: '120.0',
        formatted: '120.0 min'
      });
      expect(
        convertTo({ unit, microseconds: null, defaultValue: '10' })
      ).toEqual({ value: '10', formatted: '10' });
    });

    it('seconds', () => {
      const unit = 'seconds';
      const twentySecondsAsMicro = toMicroseconds(20, 'seconds');
      const thirtyFiveSecondsAsMicro = toMicroseconds(35, 'seconds');
      expect(convertTo({ unit, microseconds: twentySecondsAsMicro })).toEqual({
        unit: 's',
        value: '20.0',
        formatted: '20.0 s'
      });
      expect(
        convertTo({ unit, microseconds: thirtyFiveSecondsAsMicro })
      ).toEqual({ unit: 's', value: '35.0', formatted: '35.0 s' });
      expect(
        convertTo({ unit, microseconds: null, defaultValue: '10' })
      ).toEqual({ value: '10', formatted: '10' });
    });

    it('milliseconds', () => {
      const unit = 'milliseconds';
      const twentyMilliAsMicro = toMicroseconds(20, 'milliseconds');
      const thirtyFiveMilliAsMicro = toMicroseconds(35, 'milliseconds');
      expect(convertTo({ unit, microseconds: twentyMilliAsMicro })).toEqual({
        unit: 'ms',
        value: '20',
        formatted: '20 ms'
      });
      expect(
        convertTo({ unit, microseconds: thirtyFiveMilliAsMicro })
      ).toEqual({ unit: 'ms', value: '35', formatted: '35 ms' });
      expect(
        convertTo({ unit, microseconds: null, defaultValue: '10' })
      ).toEqual({ value: '10', formatted: '10' });
    });

    it('microseconds', () => {
      const unit = 'microseconds';
      expect(convertTo({ unit, microseconds: 20 })).toEqual({
        unit: 'μs',
        value: '20',
        formatted: '20 μs'
      });
      expect(convertTo({ unit, microseconds: 35 })).toEqual({
        unit: 'μs',
        value: '35',
        formatted: '35 μs'
      });
      expect(
        convertTo({ unit, microseconds: null, defaultValue: '10' })
      ).toEqual({ value: '10', formatted: '10' });
    });
  });
  describe('toMicroseconds', () => {
    it('transformes to microseconds', () => {
      expect(toMicroseconds(1, 'hours')).toEqual(3600000000);
      expect(toMicroseconds(10, 'minutes')).toEqual(600000000);
      expect(toMicroseconds(10, 'seconds')).toEqual(10000000);
      expect(toMicroseconds(10, 'milliseconds')).toEqual(10000);
    });
  });
});
