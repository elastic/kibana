/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { deserializeGlobalMaxRetention, getLifecycleValue } from './data_streams';

describe('Data stream helpers', () => {
  describe('getLifecycleValue', () => {
    it('Knows when it should be marked as disabled', () => {
      expect(
        getLifecycleValue({
          enabled: false,
        })
      ).toBe('Disabled');

      expect(getLifecycleValue()).toBe('Disabled');
    });

    it('knows when it should be marked as infinite', () => {
      expect(
        getLifecycleValue({
          enabled: true,
        })
      ).toBe('Keep data indefinitely');
    });

    it('knows when it has a defined data retention period', () => {
      expect(
        getLifecycleValue({
          enabled: true,
          data_retention: '2d',
        })
      ).toBe('2 days');
    });

    it('effective_retention should always have precedence over data_retention', () => {
      expect(
        getLifecycleValue({
          enabled: true,
          data_retention: '2d',
          effective_retention: '5d',
        })
      ).toBe('5 days');
    });
  });

  describe('deserializeGlobalMaxRetention', () => {
    it('if globalMaxRetention is undefined', () => {
      expect(deserializeGlobalMaxRetention(undefined)).toEqual({});
    });

    it('split globalMaxRetention size and units', () => {
      expect(deserializeGlobalMaxRetention('1000h')).toEqual({
        size: '1000',
        unit: 'h',
        unitText: 'hours',
      });
    });

    it('support all of the units that are accepted by es', () => {
      expect(deserializeGlobalMaxRetention('1000ms')).toEqual({
        size: '1000',
        unit: 'ms',
        unitText: 'milliseconds',
      });
      expect(deserializeGlobalMaxRetention('1000micros')).toEqual({
        size: '1000',
        unit: 'micros',
        unitText: 'microseconds',
      });
      expect(deserializeGlobalMaxRetention('1000nanos')).toEqual({
        size: '1000',
        unit: 'nanos',
        unitText: 'nanoseconds',
      });
    });
  });
});
