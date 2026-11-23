/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamsBoostProfile } from '../../../common/types';
import { formatAge, formatPeriodAges, getBoostPeriods, parseAge } from './boost_periods';

const createProfile = (recentMaxAge: string, standardMaxAge: string): DataStreamsBoostProfile => ({
  name: 'logs',
  is_builtin: false,
  type: 'data_streams',
  recent: { min_boost: 2, max_boost: 5000, max_age: recentMaxAge },
  standard: { min_boost: 1, max_boost: 10, max_age: standardMaxAge },
  background: { min_boost: 0, max_boost: 1 },
});

const describePeriods = (profile: DataStreamsBoostProfile) =>
  getBoostPeriods(profile).map((period) => ({
    id: period.id,
    ages: formatPeriodAges(period),
    isSkipped: Boolean(period.skippedReason),
  }));

describe('parseAge', () => {
  it('reads Elasticsearch time values', () => {
    expect(parseAge('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseAge('12h')).toBe(12 * 60 * 60 * 1000);
    expect(parseAge('0d')).toBe(0);
  });

  it('returns NaN for values it cannot read', () => {
    expect(parseAge('7w')).toBeNaN();
    expect(parseAge('30s')).toBeNaN();
    expect(parseAge('')).toBeNaN();
  });
});

describe('formatAge', () => {
  it('spells out days and hours', () => {
    expect(formatAge('1d')).toBe('1 day');
    expect(formatAge('30d')).toBe('30 days');
    expect(formatAge('12h')).toBe('12 hours');
  });

  it('keeps values it cannot read as they are', () => {
    expect(formatAge('7w')).toBe('7w');
  });
});

describe('getBoostPeriods', () => {
  it('gives each period its age range', () => {
    expect(describePeriods(createProfile('7d', '30d'))).toEqual([
      { id: 'recent', ages: 'Data up to 7 days old', isSkipped: false },
      { id: 'standard', ages: 'Data 7 days–30 days old', isSkipped: false },
      { id: 'background', ages: 'Data older than 30 days', isSkipped: false },
    ]);
  });

  it('skips recent when its max age is 0', () => {
    expect(describePeriods(createProfile('0d', '30d'))).toEqual([
      { id: 'recent', ages: 'Data up to 0 days old', isSkipped: true },
      { id: 'standard', ages: 'Data up to 30 days old', isSkipped: false },
      { id: 'background', ages: 'Data older than 30 days', isSkipped: false },
    ]);
  });

  it('skips standard when its max age is not later than recent', () => {
    const periods = describePeriods(createProfile('7d', '7d'));

    expect(periods[1]).toEqual(expect.objectContaining({ id: 'standard', isSkipped: true }));
    expect(periods[2]).toEqual({
      id: 'background',
      ages: 'Data older than 7 days',
      isSkipped: false,
    });
  });

  it('leaves only background when both max ages are 0', () => {
    expect(describePeriods(createProfile('0d', '0d'))).toEqual([
      expect.objectContaining({ id: 'recent', isSkipped: true }),
      expect.objectContaining({ id: 'standard', isSkipped: true }),
      { id: 'background', ages: 'Data of any age', isSkipped: false },
    ]);
  });
});
