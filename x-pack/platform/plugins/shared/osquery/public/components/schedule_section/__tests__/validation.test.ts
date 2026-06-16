/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateScheduleFormData } from '../validation';
import { createDefaultScheduleFormData } from '../types';
import type { ScheduleFormData } from '../types';
import {
  AT_LEAST_ONE_DAY_ERROR,
  SPLAY_MAX_ERROR,
  STOP_AFTER_BEFORE_START_ERROR,
} from '../translations';

const recurrenceState = (overrides: Partial<ScheduleFormData> = {}): ScheduleFormData => ({
  ...createDefaultScheduleFormData('rrule'),
  ...overrides,
});

const START = new Date('2026-01-01T00:00:00.000Z');

describe('validateScheduleFormData', () => {
  describe('interval mode', () => {
    it('is always valid (the numeric field clamps its own input)', () => {
      expect(validateScheduleFormData(createDefaultScheduleFormData('interval'))).toEqual([]);
    });
  });

  describe('happy path (recurrence)', () => {
    it('returns no errors for a valid daily recurrence with splay off', () => {
      const data = recurrenceState({
        startDate: START,
        recurrence: { frequency: 'daily', interval: 1, byweekday: [] },
        stopAfter: { enabled: false, date: new Date(START.getTime() + 86_400_000) },
        splay: { enabled: false, value: 30, unit: 'seconds' },
      });

      expect(validateScheduleFormData(data)).toEqual([]);
    });

    it('returns no errors for a custom recurrence with at least one weekday', () => {
      const data = recurrenceState({
        recurrence: { frequency: 'custom', interval: 1, byweekday: ['MO'] },
      });

      expect(validateScheduleFormData(data)).toEqual([]);
    });
  });

  describe('rule (a): custom recurrence with no weekday', () => {
    it('flags an empty byweekday on the custom frequency', () => {
      const data = recurrenceState({
        recurrence: { frequency: 'custom', interval: 1, byweekday: [] },
      });

      expect(validateScheduleFormData(data)).toContain(AT_LEAST_ONE_DAY_ERROR);
    });

    it('does not flag empty byweekday on the daily frequency', () => {
      const data = recurrenceState({
        recurrence: { frequency: 'daily', interval: 1, byweekday: [] },
      });

      expect(validateScheduleFormData(data)).not.toContain(AT_LEAST_ONE_DAY_ERROR);
    });
  });

  describe('rule (b): stop date before start', () => {
    it('flags a stop date on or before the start date', () => {
      const data = recurrenceState({
        startDate: START,
        stopAfter: { enabled: true, date: new Date(START.getTime() - 1) },
      });

      expect(validateScheduleFormData(data)).toContain(STOP_AFTER_BEFORE_START_ERROR);
    });

    it('flags a stop date equal to the start date (must be strictly after)', () => {
      const data = recurrenceState({
        startDate: START,
        stopAfter: { enabled: true, date: new Date(START.getTime()) },
      });

      expect(validateScheduleFormData(data)).toContain(STOP_AFTER_BEFORE_START_ERROR);
    });

    it('does not flag a stop date strictly after the start date', () => {
      const data = recurrenceState({
        startDate: START,
        stopAfter: { enabled: true, date: new Date(START.getTime() + 1000) },
      });

      expect(validateScheduleFormData(data)).not.toContain(STOP_AFTER_BEFORE_START_ERROR);
    });

    it('ignores the stop date when the toggle is off', () => {
      const data = recurrenceState({
        startDate: START,
        stopAfter: { enabled: false, date: new Date(START.getTime() - 1) },
      });

      expect(validateScheduleFormData(data)).not.toContain(STOP_AFTER_BEFORE_START_ERROR);
    });
  });

  describe('rule (c): splay over the 12h cap', () => {
    it('flags a single-unit splay above 12 hours', () => {
      const data = recurrenceState({
        splay: { enabled: true, value: 13, unit: 'hours' },
      });

      expect(validateScheduleFormData(data)).toContain(SPLAY_MAX_ERROR);
    });

    it('does not flag a single-unit splay at the 12h boundary', () => {
      const data = recurrenceState({
        splay: { enabled: true, value: 12, unit: 'hours' },
      });

      expect(validateScheduleFormData(data)).not.toContain(SPLAY_MAX_ERROR);
    });

    it('flags an over-cap compound splay via the summed total', () => {
      const data = recurrenceState({
        splay: { enabled: true, value: 1, unit: 'hours', rawCompound: '13h0m' },
      });

      expect(validateScheduleFormData(data)).toContain(SPLAY_MAX_ERROR);
    });

    it('does not flag a within-cap compound splay', () => {
      const data = recurrenceState({
        splay: { enabled: true, value: 1, unit: 'hours', rawCompound: '1h30m' },
      });

      expect(validateScheduleFormData(data)).not.toContain(SPLAY_MAX_ERROR);
    });

    it('ignores splay when the toggle is off', () => {
      const data = recurrenceState({
        splay: { enabled: false, value: 13, unit: 'hours' },
      });

      expect(validateScheduleFormData(data)).not.toContain(SPLAY_MAX_ERROR);
    });
  });

  it('accumulates multiple errors at once', () => {
    const data = recurrenceState({
      startDate: START,
      recurrence: { frequency: 'custom', interval: 1, byweekday: [] },
      stopAfter: { enabled: true, date: new Date(START.getTime() - 1) },
      splay: { enabled: true, value: 13, unit: 'hours' },
    });

    const errors = validateScheduleFormData(data);
    expect(errors).toContain(AT_LEAST_ONE_DAY_ERROR);
    expect(errors).toContain(STOP_AFTER_BEFORE_START_ERROR);
    expect(errors).toContain(SPLAY_MAX_ERROR);
    expect(errors).toHaveLength(3);
  });
});
