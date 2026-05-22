/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import { EisModelStatus } from '../../common/types';
import {
  getModelEOLDate,
  getModelStatus,
  isModelDeprecated,
  isModelEndOfLifeReached,
} from './eis_utils';

const makeMetadata = (
  overrides: NonNullable<EisInferenceEndpointMetadata['heuristics']>
): EisInferenceEndpointMetadata => ({
  heuristics: overrides,
});

describe('eis utility functions', function () {
  describe('isModelEndOfLifeReached', function () {
    it('returns false when metadata is undefined', () => {
      expect(isModelEndOfLifeReached(undefined)).toBe(false);
    });

    it('returns false when end_of_life_date is absent', () => {
      expect(isModelEndOfLifeReached(makeMetadata({ status: 'ga' }))).toBe(false);
    });

    it('returns true when end_of_life_date is in the past', () => {
      expect(isModelEndOfLifeReached(makeMetadata({ end_of_life_date: '2020-01-01' }))).toBe(true);
    });

    it('returns false when end_of_life_date is in the future', () => {
      expect(isModelEndOfLifeReached(makeMetadata({ end_of_life_date: '2099-01-01' }))).toBe(false);
    });
  });

  describe('getModelEOLDate', function () {
    it('returns undefined when metadata is undefined', () => {
      expect(getModelEOLDate(undefined)).toBeUndefined();
    });

    it('returns undefined when end_of_life_date is absent', () => {
      expect(getModelEOLDate(makeMetadata({ status: 'ga' }))).toBeUndefined();
    });

    it('returns a Moment for a valid end_of_life_date', () => {
      const result = getModelEOLDate(makeMetadata({ end_of_life_date: '2026-04-15' }));
      expect(result).toBeDefined();
      expect(result?.format('YYYY-MM-DD')).toBe('2026-04-15');
    });
  });

  describe('isModelDeprecated', function () {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-13'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns false when metadata is undefined', () => {
      expect(isModelDeprecated(undefined)).toBe(false);
    });

    it('returns false when no EOL date and status is ga', () => {
      expect(isModelDeprecated(makeMetadata({ status: 'ga' }))).toBe(false);
    });

    it('returns true when status is deprecated and no EOL date', () => {
      expect(isModelDeprecated(makeMetadata({ status: 'deprecated' }))).toBe(true);
    });

    it('returns true when EOL date is within the next 30 days', () => {
      expect(isModelDeprecated(makeMetadata({ end_of_life_date: '2026-06-01' }))).toBe(true);
    });

    it('returns false when EOL date is more than 30 days in the future', () => {
      expect(isModelDeprecated(makeMetadata({ end_of_life_date: '2026-07-01' }))).toBe(false);
    });
  });

  describe('getModelStatus', function () {
    it('returns Unknown when metadata is undefined', () => {
      expect(getModelStatus(undefined)).toBe(EisModelStatus.Unknown);
    });

    it('returns Unknown when heuristics is absent', () => {
      expect(getModelStatus({})).toBe(EisModelStatus.Unknown);
    });

    it('returns Unknown when status is an unrecognized value', () => {
      expect(getModelStatus(makeMetadata({ status: 'beta' }))).toBe(EisModelStatus.Unknown);
    });

    it('returns GA when status is ga', () => {
      expect(getModelStatus(makeMetadata({ status: 'ga' }))).toBe(EisModelStatus.GA);
    });

    it('returns Preview when status is preview', () => {
      expect(getModelStatus(makeMetadata({ status: 'preview' }))).toBe(EisModelStatus.Preview);
    });

    it('returns Deprecated when status is deprecated and EOL date is in the future', () => {
      expect(
        getModelStatus(makeMetadata({ status: 'deprecated', end_of_life_date: '2099-01-01' }))
      ).toBe(EisModelStatus.Deprecated);
    });

    it('returns Deprecated when EOL date is within the next 30 days regardless of status', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-13'));
      try {
        expect(getModelStatus(makeMetadata({ status: 'ga', end_of_life_date: '2026-06-01' }))).toBe(
          EisModelStatus.Deprecated
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('returns DeprecatedEOL when EOL date is in the past regardless of status', () => {
      expect(
        getModelStatus(makeMetadata({ status: 'deprecated', end_of_life_date: '2020-01-01' }))
      ).toBe(EisModelStatus.DeprecatedEOL);
    });

    it('returns DeprecatedEOL when EOL date is in the past even when status is ga', () => {
      expect(getModelStatus(makeMetadata({ status: 'ga', end_of_life_date: '2020-01-01' }))).toBe(
        EisModelStatus.DeprecatedEOL
      );
    });
  });
});
