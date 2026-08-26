/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { validateDuration, computeEndDate } from './duration_validation';
import type { CustomDurationState } from '../components/types';

const MOCKED_NOW = '2026-03-09T19:05:00.000Z';

jest.mock('moment', () => {
  const actual = jest.requireActual('moment');
  return Object.assign(
    (...args: unknown[]) => (args.length ? actual(...args) : actual(MOCKED_NOW)),
    actual,
    { tz: { guess: () => 'UTC' } }
  );
});

const baseDuration: CustomDurationState = {
  mode: 'duration',
  value: 1,
  unit: 'h',
  dateTime: null,
};

describe('validateDuration', () => {
  it('returns all false when duration is null', () => {
    expect(validateDuration(null)).toEqual({
      isDurationInvalid: false,
      isPastDateTime: false,
      isDateTimeMissing: false,
    });
  });

  describe('duration mode', () => {
    it('returns all false for a valid duration', () => {
      expect(validateDuration({ ...baseDuration, value: 3 })).toEqual({
        isDurationInvalid: false,
        isPastDateTime: false,
        isDateTimeMissing: false,
      });
    });

    it('marks isDurationInvalid when value is less than 1', () => {
      const result = validateDuration({ ...baseDuration, value: 0 });
      expect(result.isDurationInvalid).toBe(true);
      expect(result.isPastDateTime).toBe(false);
      expect(result.isDateTimeMissing).toBe(false);
    });

    it('marks isDurationInvalid when value is a negative number', () => {
      const result = validateDuration({ ...baseDuration, value: -5 });
      expect(result.isDurationInvalid).toBe(true);
      expect(result.isPastDateTime).toBe(false);
      expect(result.isDateTimeMissing).toBe(false);
    });

    it('marks isDurationInvalid when value is not an integer', () => {
      const result = validateDuration({ ...baseDuration, value: 1.5 });
      expect(result.isDurationInvalid).toBe(true);
      expect(result.isPastDateTime).toBe(false);
      expect(result.isDateTimeMissing).toBe(false);
    });

    it('ignores a stale past dateTime value — isPastDateTime is false in duration mode', () => {
      const result = validateDuration({
        ...baseDuration,
        dateTime: moment(MOCKED_NOW).subtract(1, 'h'),
      });
      expect(result.isPastDateTime).toBe(false);
      expect(result.isDurationInvalid).toBe(false);
      expect(result.isDateTimeMissing).toBe(false);
    });
  });

  describe('datetime mode', () => {
    const datetimeBase: CustomDurationState = { ...baseDuration, mode: 'datetime' };

    it('marks isDateTimeMissing when dateTime is null', () => {
      const result = validateDuration({ ...datetimeBase, dateTime: null });
      expect(result.isDurationInvalid).toBe(false);
      expect(result.isPastDateTime).toBe(false);
      expect(result.isDateTimeMissing).toBe(true);
    });

    it('marks isPastDateTime when dateTime is set to a past time', () => {
      const result = validateDuration({
        ...datetimeBase,
        dateTime: moment(MOCKED_NOW).subtract(1, 'h'),
      });
      expect(result.isPastDateTime).toBe(true);
      expect(result.isDurationInvalid).toBe(false);
      expect(result.isDateTimeMissing).toBe(false);
    });

    it('returns all false for a valid future dateTime', () => {
      const result = validateDuration({
        ...datetimeBase,
        dateTime: moment(MOCKED_NOW).add(2, 'h'),
      });
      expect(result).toEqual({
        isDurationInvalid: false,
        isPastDateTime: false,
        isDateTimeMissing: false,
      });
    });
  });
});

describe('computeEndDate', () => {
  it('returns null when duration is null', () => {
    expect(computeEndDate(null)).toBeNull();
  });

  describe('duration mode', () => {
    it('returns an ISO date string offset by value and unit from now', () => {
      const result = computeEndDate({ ...baseDuration, value: 2, unit: 'h' });
      expect(result).toBe(moment(MOCKED_NOW).add(2, 'h').toISOString());
    });

    it('handles different units correctly', () => {
      expect(computeEndDate({ ...baseDuration, value: 3, unit: 'd' })).toBe(
        moment(MOCKED_NOW).add(3, 'd').toISOString()
      );
      expect(computeEndDate({ ...baseDuration, value: 1, unit: 'w' })).toBe(
        moment(MOCKED_NOW).add(1, 'w').toISOString()
      );
    });
  });

  describe('datetime mode', () => {
    it('returns the dateTime as an ISO string when dateTime is set', () => {
      const dt = moment(MOCKED_NOW).add(5, 'h');
      const result = computeEndDate({ ...baseDuration, mode: 'datetime', dateTime: dt });
      expect(result).toBe(dt.toISOString());
    });

    it('returns null when dateTime is null', () => {
      const result = computeEndDate({ ...baseDuration, mode: 'datetime', dateTime: null });
      expect(result).toBeNull();
    });
  });
});
