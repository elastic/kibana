/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  exceedsMaximumRetentionPeriod,
  getMaximumRetentionMessage,
  getMaximumRetentionPeriodMs,
} from './maximum_retention';

describe('data_phases/shared/maximum_retention', () => {
  describe('getMaximumRetentionMessage()', () => {
    it('formats the shared maximum retention message', () => {
      expect(getMaximumRetentionMessage('365d')).toBe(
        'Must occur before the maximum retention (365d).'
      );
    });
  });

  describe('getMaximumRetentionPeriodMs()', () => {
    it('returns milliseconds for valid maximum retention periods', () => {
      expect(getMaximumRetentionPeriodMs('2d')).toBe(172_800_000);
    });

    it('returns undefined for missing, invalid, or non-positive periods', () => {
      expect(getMaximumRetentionPeriodMs(undefined)).toBeUndefined();
      expect(getMaximumRetentionPeriodMs('invalid')).toBeUndefined();
      expect(getMaximumRetentionPeriodMs('0d')).toBeUndefined();
    });
  });

  describe('exceedsMaximumRetentionPeriod()', () => {
    it('returns false when the duration cannot be parsed', () => {
      expect(
        exceedsMaximumRetentionPeriod({
          value: '',
          unit: 'd',
          maximumRetentionPeriod: '365d',
        })
      ).toBe(false);
    });

    it('returns true when the duration is greater than the maximum retention period', () => {
      expect(
        exceedsMaximumRetentionPeriod({
          value: '366',
          unit: 'd',
          maximumRetentionPeriod: '365d',
        })
      ).toBe(true);
    });

    it('returns false when the duration is equal to or less than the maximum retention period', () => {
      expect(
        exceedsMaximumRetentionPeriod({
          value: '365',
          unit: 'd',
          maximumRetentionPeriod: '365d',
        })
      ).toBe(false);
      expect(
        exceedsMaximumRetentionPeriod({
          value: '364',
          unit: 'd',
          maximumRetentionPeriod: '365d',
        })
      ).toBe(false);
    });
  });
});
