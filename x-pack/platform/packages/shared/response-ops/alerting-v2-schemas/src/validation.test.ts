/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseDurationToMs,
  validateDuration,
  validateMaxDuration,
  validateMinDuration,
  validateEsqlQuery,
} from './validation';

describe('parseDurationToMs', () => {
  it.each([
    ['1ms', 1],
    ['1s', 1_000],
    ['1m', 60_000],
    ['1h', 3_600_000],
    ['1d', 86_400_000],
    ['1w', 604_800_000],
    ['5m', 300_000],
    ['2h', 7_200_000],
    ['365d', 365 * 86_400_000],
    ['52w', 52 * 604_800_000],
  ] as const)('converts "%s" to %i ms', (duration, expected) => {
    expect(parseDurationToMs(duration)).toBe(expected);
  });

  it('returns NaN for an invalid duration string', () => {
    expect(parseDurationToMs('bad')).toBeNaN();
  });

  it('returns NaN for an empty string', () => {
    expect(parseDurationToMs('')).toBeNaN();
  });
});

describe('validateDuration', () => {
  it.each(['500ms', '30s', '5m', '1h', '7d', '2w'])('accepts valid duration "%s"', (value) => {
    expect(validateDuration(value)).toBeUndefined();
  });

  it.each(['', 'abc', '5x', '1.5m', 'm5', '5 m', '5M', '5H', '-1m', '5min', null, undefined, NaN])(
    'rejects invalid duration "%s"',
    (value) => {
      // @ts-expect-error - testing invalid values
      expect(validateDuration(value)).not.toBeUndefined();
    }
  );
});

describe('validateMaxDuration', () => {
  const MAX = '365d';

  it('accepts a value at the exact boundary (365d)', () => {
    expect(validateMaxDuration('365d', MAX)).toBeUndefined();
  });

  it('accepts 500m which is well within the limit', () => {
    // 500 minutes << 365 days
    expect(validateMaxDuration('500m', MAX)).toBeUndefined();
  });

  it('accepts 52w which is within the limit via week-to-day conversion', () => {
    // 52 weeks = 364 days < 365 days
    expect(validateMaxDuration('52w', MAX)).toBeUndefined();
  });

  it('rejects 366d which is one day over the limit', () => {
    expect(validateMaxDuration('366d', MAX)).toMatch(/exceeds/);
  });

  it('rejects 55w which exceeds 365d via week-to-day conversion', () => {
    // 55 weeks = 385 days > 365 days
    expect(validateMaxDuration('55w', MAX)).toMatch(/exceeds/);
  });

  it('rejects a large number of minutes that exceeds the limit', () => {
    // 366 * 24 * 60 = 527,040 minutes > 365 days
    expect(validateMaxDuration('527040m', MAX)).toMatch(/exceeds/);
  });

  it('returns undefined when the value is an invalid duration string', () => {
    expect(validateMaxDuration('bad', MAX)).toBeUndefined();
  });
});

describe('validateMinDuration', () => {
  const MIN = '1m';

  it('accepts a value at the exact minimum (1m)', () => {
    expect(validateMinDuration('1m', MIN)).toBeUndefined();
  });

  it('accepts 5m which is above the minimum', () => {
    expect(validateMinDuration('5m', MIN)).toBeUndefined();
  });

  it('accepts 90s which is above 1 minute via second-to-minute conversion', () => {
    // 90 seconds = 1.5 minutes > 1 minute
    expect(validateMinDuration('90s', MIN)).toBeUndefined();
  });

  it('rejects 30s which is below 1 minute', () => {
    expect(validateMinDuration('30s', MIN)).toMatch(/below/);
  });

  it('rejects 59s which is just below 1 minute', () => {
    expect(validateMinDuration('59s', MIN)).toMatch(/below/);
  });

  it('rejects 500ms which is well below 1 minute', () => {
    expect(validateMinDuration('500ms', MIN)).toMatch(/below/);
  });

  it('returns undefined when the value is an invalid duration string', () => {
    expect(validateMinDuration('bad', MIN)).toBeUndefined();
  });
});

describe('validateEsqlQuery', () => {
  it('accepts valid ES|QL query', () => {
    expect(validateEsqlQuery('FROM logs-* | LIMIT 1')).toBeUndefined();
  });

  it('rejects invalid ES|QL query', () => {
    expect(validateEsqlQuery('FROM |')).toMatch(/Invalid ES\|QL query/);
  });
});
