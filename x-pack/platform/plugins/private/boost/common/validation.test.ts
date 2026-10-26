/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBoostRangeError,
  formatMaxAge,
  getIndexPatternError,
  getIndexPatternsError,
  getMaxAgeError,
  getProfileNameError,
  getRulePriorityError,
  parseMaxAge,
  isPinnedWithoutPrewarm,
} from './validation';

describe('getProfileNameError', () => {
  it.each([
    ['', 'required'],
    ['My Profile', 'invalid_characters'],
    ['_hidden', 'invalid_characters'],
    ['-dash', 'invalid_characters'],
    ['a'.repeat(256), 'too_long'],
  ])('rejects %p as %p', (name, error) => {
    expect(getProfileNameError(name)).toBe(error);
  });

  it('accepts lowercase names with numbers, hyphens and underscores', () => {
    expect(getProfileNameError('products_fast-2')).toBeUndefined();
  });

  it('rejects names that are already taken', () => {
    expect(getProfileNameError('storefront', ['storefront'])).toBe('already_exists');
  });
});

describe('getBoostRangeError', () => {
  it.each([
    [undefined, 1, 'min_required'],
    [1, undefined, 'max_required'],
    [-1, 1, 'min_out_of_range'],
    [1, 5001, 'max_out_of_range'],
    [0, 0, 'max_not_positive'],
    [4, 2, 'max_below_min'],
  ])('rejects min %p and max %p as %p', (minBoost, maxBoost, error) => {
    expect(getBoostRangeError(minBoost, maxBoost)).toBe(error);
  });

  it('accepts a range within the API bounds', () => {
    expect(getBoostRangeError(0, 5000)).toBeUndefined();
    expect(getBoostRangeError(0.28, 1)).toBeUndefined();
  });
});

describe('getMaxAgeError', () => {
  it('requires a whole number of at least one', () => {
    expect(getMaxAgeError(undefined)).toBe('required');
    expect(getMaxAgeError({ value: 0, unit: 'h' })).toBe('out_of_range');
    expect(getMaxAgeError({ value: 1.5, unit: 'd' })).toBe('out_of_range');
  });

  it('caps the max age at the same length in either unit', () => {
    expect(getMaxAgeError({ value: 3650, unit: 'd' })).toBeUndefined();
    expect(getMaxAgeError({ value: 3651, unit: 'd' })).toBe('out_of_range');
    expect(getMaxAgeError({ value: 3650 * 24 + 1, unit: 'h' })).toBe('out_of_range');
  });

  it('rejects a max age shorter than the previous period, across units', () => {
    expect(getMaxAgeError({ value: 3, unit: 'd' }, { value: 7, unit: 'd' })).toBe(
      'below_previous_period'
    );
    expect(getMaxAgeError({ value: 12, unit: 'h' }, { value: 1, unit: 'd' })).toBe(
      'below_previous_period'
    );
    expect(getMaxAgeError({ value: 24, unit: 'h' }, { value: 1, unit: 'd' })).toBeUndefined();
  });
});

describe('parseMaxAge', () => {
  it('parses day and hour durations', () => {
    expect(parseMaxAge('7d')).toEqual({ value: 7, unit: 'd' });
    expect(parseMaxAge('12h')).toEqual({ value: 12, unit: 'h' });
    expect(parseMaxAge('90m')).toBeUndefined();
    expect(parseMaxAge(undefined)).toBeUndefined();
  });

  it('round-trips through formatMaxAge', () => {
    expect(formatMaxAge({ value: 12, unit: 'h' })).toBe('12h');
    expect(parseMaxAge(formatMaxAge({ value: 3, unit: 'd' }))).toEqual({ value: 3, unit: 'd' });
  });
});

describe('getIndexPatternError', () => {
  it('accepts a single name or wildcard pattern', () => {
    expect(getIndexPatternError('logs-checkout-default')).toBeUndefined();
    expect(getIndexPatternError('logs-*')).toBeUndefined();
  });

  it('rejects empty patterns and lists', () => {
    expect(getIndexPatternError('')).toBe('required');
    expect(getIndexPatternError('logs-a,logs-b')).toBe('invalid_characters');
    expect(getIndexPatternError('logs a')).toBe('invalid_characters');
  });
});

describe('getIndexPatternsError', () => {
  it('accepts one pattern or a list of names', () => {
    expect(getIndexPatternsError(['logs-*'])).toBeUndefined();
    expect(getIndexPatternsError(['products', 'users'])).toBeUndefined();
  });

  it('rejects empty targets and patterns within a list', () => {
    expect(getIndexPatternsError([])).toBe('required');
    expect(getIndexPatternsError(['products', 'logs-*'])).toBe('wildcard_in_list');
  });
});

describe('getRulePriorityError', () => {
  it('accepts whole numbers of 0 or more', () => {
    expect(getRulePriorityError(0)).toBeUndefined();
    expect(getRulePriorityError(100000)).toBeUndefined();
  });

  it('rejects missing, negative, and fractional priorities', () => {
    expect(getRulePriorityError(undefined)).toBe('required');
    expect(getRulePriorityError(-1)).toBe('out_of_range');
    expect(getRulePriorityError(1.5)).toBe('out_of_range');
  });
});

describe('isPinnedWithoutPrewarm', () => {
  it('only allows pinning prewarmed data', () => {
    expect(isPinnedWithoutPrewarm({ prewarm: false, pinned: true })).toBe(true);
    expect(isPinnedWithoutPrewarm({ prewarm: true, pinned: true })).toBe(false);
    expect(isPinnedWithoutPrewarm({ prewarm: false, pinned: false })).toBe(false);
  });
});
