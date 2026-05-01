/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EisInferenceEndpointMetadata } from '../../common/types';
import { getModelEOLDate, isModelDecommissioned, isModelDeprecated } from './eis_utils';

const makeMetadata = (
  overrides: NonNullable<EisInferenceEndpointMetadata['heuristics']>
): EisInferenceEndpointMetadata => ({
  heuristics: overrides,
});

describe('eis utility functions', function () {
  describe('isModelDeprecated', function () {
    it('returns false when metadata is undefined', () => {
      expect(isModelDeprecated(undefined)).toBe(false);
    });

    it('returns true when status is deprecated', () => {
      expect(isModelDeprecated(makeMetadata({ status: 'deprecated' }))).toBe(true);
    });

    it('returns false when status is ga', () => {
      expect(isModelDeprecated(makeMetadata({ status: 'ga' }))).toBe(false);
    });

    it('is case-insensitive for the deprecated status', () => {
      expect(isModelDeprecated(makeMetadata({ status: 'Deprecated' }))).toBe(true);
    });
  });

  describe('isModelDecommissioned', function () {
    it('returns false when metadata is undefined', () => {
      expect(isModelDecommissioned(undefined)).toBe(false);
    });

    it('returns false when end_of_life_date is absent', () => {
      expect(isModelDecommissioned(makeMetadata({ status: 'ga' }))).toBe(false);
    });

    it('returns true when end_of_life_date is in the past', () => {
      expect(isModelDecommissioned(makeMetadata({ end_of_life_date: '2020-01-01' }))).toBe(true);
    });

    it('returns false when end_of_life_date is in the future', () => {
      expect(isModelDecommissioned(makeMetadata({ end_of_life_date: '2099-01-01' }))).toBe(false);
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
});
