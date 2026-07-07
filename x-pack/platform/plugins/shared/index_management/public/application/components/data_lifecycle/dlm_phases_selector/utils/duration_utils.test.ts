/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDurationLabel,
  getDurationUnitSelectOptions,
  isPositiveInteger,
  mergeDefaultValue,
  serializeDlmPhases,
  validateDurations,
} from './duration_utils';

describe('duration_utils', () => {
  describe('isPositiveInteger', () => {
    it('accepts positive whole numbers', () => {
      expect(isPositiveInteger('1')).toBe(true);
      expect(isPositiveInteger('30')).toBe(true);
    });

    it('rejects zero, negatives, and non-numeric values', () => {
      expect(isPositiveInteger('0')).toBe(false);
      expect(isPositiveInteger('-1')).toBe(false);
      expect(isPositiveInteger('abc')).toBe(false);
    });
  });

  describe('getDurationLabel', () => {
    it('concatenates value and unit', () => {
      expect(getDurationLabel({ enabled: true, value: '30', unit: 'd' })).toBe('30d');
    });
  });

  describe('mergeDefaultValue', () => {
    it('returns default frozen and delete durations when no defaultValue is provided', () => {
      expect(mergeDefaultValue()).toEqual({
        frozen: { enabled: false, value: '30', unit: 'd' },
        delete: { enabled: false, value: '60', unit: 'd' },
      });
    });

    it('merges partial defaultValue overrides', () => {
      expect(
        mergeDefaultValue({
          frozen: { enabled: true, value: '7' },
          delete: { enabled: true },
        })
      ).toEqual({
        frozen: { enabled: true, value: '7', unit: 'd' },
        delete: { enabled: true, value: '60', unit: 'd' },
      });
    });
  });

  describe('serializeDlmPhases', () => {
    it('omits disabled phases from serialized output', () => {
      expect(
        serializeDlmPhases({
          frozen: { enabled: false, value: '30', unit: 'd' },
          delete: { enabled: false, value: '60', unit: 'd' },
        })
      ).toEqual({
        frozen_after: undefined,
        data_retention: undefined,
      });
    });

    it('serializes enabled phases', () => {
      expect(
        serializeDlmPhases({
          frozen: { enabled: true, value: '30', unit: 'd' },
          delete: { enabled: true, value: '90', unit: 'd' },
        })
      ).toEqual({
        frozen_after: '30d',
        data_retention: '90d',
      });
    });
  });

  describe('validateDurations', () => {
    it('is valid when optional phases are disabled', () => {
      expect(
        validateDurations({
          frozen: { enabled: false, value: '30', unit: 'd' },
          delete: { enabled: false, value: '60', unit: 'd' },
        })
      ).toEqual({ isValid: true });
    });

    it('requires positive integer durations for enabled phases', () => {
      expect(
        validateDurations({
          frozen: { enabled: true, value: '0', unit: 'd' },
          delete: { enabled: true, value: 'abc', unit: 'd' },
        })
      ).toEqual({
        frozenError: 'Enter a whole number greater than 0.',
        deleteError: 'Enter a whole number greater than 0.',
        isValid: false,
      });
    });

    it('requires frozen to occur before delete when both are enabled', () => {
      expect(
        validateDurations({
          frozen: { enabled: true, value: '60', unit: 'd' },
          delete: { enabled: true, value: '30', unit: 'd' },
        })
      ).toEqual({
        frozenError: 'Must occur before the delete phase (30d).',
        deleteError: 'Must occur after the frozen phase (60d).',
        isValid: false,
      });
    });

    it('compares durations across units', () => {
      expect(
        validateDurations({
          frozen: { enabled: true, value: '48', unit: 'h' },
          delete: { enabled: true, value: '1', unit: 'd' },
        })
      ).toEqual({
        frozenError: 'Must occur before the delete phase (1d).',
        deleteError: 'Must occur after the frozen phase (48h).',
        isValid: false,
      });
    });

    it('is valid when frozen occurs before delete', () => {
      expect(
        validateDurations({
          frozen: { enabled: true, value: '30', unit: 'd' },
          delete: { enabled: true, value: '60', unit: 'd' },
        })
      ).toEqual({ isValid: true });
    });

    it('is invalid when frozen and delete durations are equal', () => {
      expect(
        validateDurations({
          frozen: { enabled: true, value: '30', unit: 'd' },
          delete: { enabled: true, value: '30', unit: 'd' },
        }).isValid
      ).toBe(false);
    });

    it('compares durations with ES API sub-second units', () => {
      expect(
        validateDurations({
          frozen: { enabled: true, value: '2000', unit: 'ms' },
          delete: { enabled: true, value: '1', unit: 's' },
        })
      ).toEqual({
        frozenError: 'Must occur before the delete phase (1s).',
        deleteError: 'Must occur after the frozen phase (2000ms).',
        isValid: false,
      });
    });

    it('skips ordering validation when a phase uses an unknown unit', () => {
      expect(
        validateDurations({
          frozen: { enabled: true, value: '60', unit: 'd' },
          delete: { enabled: true, value: '30', unit: 'otherUnit' },
        })
      ).toEqual({ isValid: true });
    });
  });

  describe('getDurationUnitSelectOptions', () => {
    it('returns UI units when the current unit is selectable', () => {
      expect(getDurationUnitSelectOptions('d').map((unit) => unit.value)).toEqual([
        'd',
        'h',
        'm',
        's',
      ]);
    });

    it('includes a known ES API unit when it is not in the UI list', () => {
      const options = getDurationUnitSelectOptions('ms');

      expect(options).toHaveLength(5);
      expect(options[4]).toEqual({ value: 'ms', text: 'milliseconds' });
    });

    it('includes unknown API units using the raw unit value', () => {
      const options = getDurationUnitSelectOptions('otherUnit');

      expect(options).toHaveLength(5);
      expect(options[4]).toEqual({ value: 'otherUnit', text: 'otherUnit' });
    });
  });
});
