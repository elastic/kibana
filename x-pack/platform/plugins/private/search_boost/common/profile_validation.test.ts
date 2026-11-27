/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostLimits } from './profile_validation';
import {
  formatMaxAge,
  parseMaxAge,
  validateMaxAge,
  validateMaxBoost,
  validateMinBoost,
} from './profile_validation';

const LIMITS: BoostLimits = { minBoost: 1, maxBoost: 19 };
const ELASTICSEARCH_LIMITS: BoostLimits = { minBoost: 0, maxBoost: 5000 };

describe('validateMinBoost', () => {
  it.each([1, 1.5, 19])('accepts %p', (minBoost) => {
    expect(validateMinBoost(minBoost, LIMITS)).toBeUndefined();
  });

  it('requires a min boost', () => {
    expect(validateMinBoost(undefined, LIMITS)).toEqual({
      code: 'required',
      message: 'Enter a minimum boost.',
    });
  });

  it.each([0.99, 19.01, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects %p outside the limits',
    (minBoost) => {
      expect(validateMinBoost(minBoost, LIMITS)).toEqual({
        code: 'outOfRange',
        message: 'Enter a value from 1 to 19.',
      });
    }
  );

  it('formats the limits in the message', () => {
    expect(validateMinBoost(6000, ELASTICSEARCH_LIMITS)?.message).toBe(
      'Enter a value from 0 to 5,000.'
    );
  });
});

describe('validateMaxBoost', () => {
  it.each([
    [1, 1],
    [19, 1],
    [2.5, 2.5],
  ])('accepts %p with a min boost of %p', (maxBoost, minBoost) => {
    expect(validateMaxBoost(maxBoost, minBoost, LIMITS)).toBeUndefined();
  });

  it('requires a max boost', () => {
    expect(validateMaxBoost(undefined, 1, LIMITS)).toEqual({
      code: 'required',
      message: 'Enter a maximum boost.',
    });
  });

  it.each([0.5, 20, Number.NaN])('rejects %p outside the limits', (maxBoost) => {
    expect(validateMaxBoost(maxBoost, 1, LIMITS)).toEqual({
      code: 'outOfRange',
      message: 'Enter a value from 1 to 19.',
    });
  });

  it('rejects a max boost of 0, which Elasticsearch never accepts', () => {
    expect(validateMaxBoost(0, 0, ELASTICSEARCH_LIMITS)).toEqual({
      code: 'notPositive',
      message: 'Maximum boost must be greater than 0.',
    });
  });

  it('rejects a max boost below the min boost', () => {
    expect(validateMaxBoost(2, 3, LIMITS)).toEqual({
      code: 'belowMin',
      message: 'Maximum boost must be at least the minimum boost.',
    });
  });

  it.each([undefined, 0, 25])(
    'waits for a valid min boost to compare with, given %p',
    (minBoost) => {
      expect(validateMaxBoost(2, minBoost, LIMITS)).toBeUndefined();
    }
  );

  it('keeps the max boost within the ratio to the min boost', () => {
    const limits = { ...LIMITS, maxRatio: 4 };

    expect(validateMaxBoost(8, 2, limits)).toBeUndefined();
    expect(validateMaxBoost(8.5, 2, limits)).toEqual({
      code: 'aboveRatio',
      message: 'Maximum boost must be at most 4 times the minimum boost.',
    });
  });

  it('has no ratio limit when the ratio is 0', () => {
    expect(validateMaxBoost(19, 1, { ...LIMITS, maxRatio: 0 })).toBeUndefined();
  });
});

describe('validateMaxAge', () => {
  it.each([
    { value: 0, unit: 'h' },
    { value: 12, unit: 'h' },
    { value: 3650, unit: 'd' },
    { value: 87_600, unit: 'h' },
  ] as const)('accepts %p', (maxAge) => {
    expect(validateMaxAge(maxAge)).toBeUndefined();
  });

  it('requires an age', () => {
    expect(validateMaxAge(undefined)).toEqual({ code: 'required', message: 'Enter an age.' });
  });

  it.each([
    { value: -1, unit: 'd' },
    { value: 1.5, unit: 'd' },
    { value: 3651, unit: 'd' },
    { value: 87_601, unit: 'h' },
    { value: Number.NaN, unit: 'h' },
  ] as const)('rejects %p', (maxAge) => {
    expect(validateMaxAge(maxAge)).toEqual({
      code: 'outOfRange',
      message: 'Enter a whole number from 0 up to 3,650 days.',
    });
  });

  it('compares a standard max age with the recent one across units', () => {
    expect(validateMaxAge({ value: 24, unit: 'h' }, { value: 1, unit: 'd' })).toBeUndefined();
    expect(validateMaxAge({ value: 23, unit: 'h' }, { value: 1, unit: 'd' })).toEqual({
      code: 'belowRecent',
      message: "Must be at least the recent phase's age.",
    });
  });

  it('ignores an invalid recent max age', () => {
    expect(validateMaxAge({ value: 1, unit: 'd' }, { value: 1.5, unit: 'd' })).toBeUndefined();
  });
});

describe('parseMaxAge', () => {
  it.each([
    ['12h', { value: 12, unit: 'h' }],
    ['7d', { value: 7, unit: 'd' }],
    ['0', { value: 0, unit: 'd' }],
    ['0ms', { value: 0, unit: 'd' }],
  ])('reads %p', (maxAge, expected) => {
    expect(parseMaxAge(maxAge)).toEqual(expected);
  });

  it.each(['90m', '1w', 'abc', ''])('rejects %p', (maxAge) => {
    expect(parseMaxAge(maxAge)).toBeUndefined();
  });
});

describe('formatMaxAge', () => {
  it('writes the max age as Elasticsearch takes it', () => {
    expect(formatMaxAge({ value: 12, unit: 'h' })).toBe('12h');
  });
});
