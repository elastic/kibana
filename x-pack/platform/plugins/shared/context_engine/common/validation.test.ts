/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseIntervalMinutes,
  parseRelativeFromMinutes,
  validateAbsoluteSignalWindow,
  validateFeedbackAnalysisInterval,
  validateRelativeSignalWindow,
  validateSignalWindowCoversInterval,
} from './validation';

describe('parseIntervalMinutes', () => {
  it.each([
    ['30m', 30],
    ['1h', 60],
    ['24h', 1440],
    ['7d', 10080],
  ])('parses %s', (value, expected) => {
    expect(parseIntervalMinutes(value)).toBe(expected);
  });

  it.each(['', '0h', 'hourly', '1', 'h', '-1h', '1.5h', '1w', '1M', '01h'])(
    'rejects %s',
    (value) => {
      expect(parseIntervalMinutes(value)).toBeUndefined();
    }
  );
});

describe('validateFeedbackAnalysisInterval', () => {
  it('accepts an interval at or above the floor', () => {
    expect(validateFeedbackAnalysisInterval('15m')).toBeUndefined();
    expect(validateFeedbackAnalysisInterval('24h')).toBeUndefined();
  });

  it('rejects an interval below the floor', () => {
    expect(validateFeedbackAnalysisInterval('14m')).toMatch(/at least 15 minutes/);
  });

  it('rejects a malformed interval before the floor is considered', () => {
    expect(validateFeedbackAnalysisInterval('nightly')).toMatch(/positive number followed by/);
  });
});

describe('parseRelativeFromMinutes', () => {
  it.each([
    ['now-30m', 30],
    ['now-12h', 720],
    ['now-7d', 10080],
    ['now-2w', 20160],
    ['now-1M', 43200],
    ['now-1y', 525600],
  ])('parses %s', (value, expected) => {
    expect(parseRelativeFromMinutes(value)).toBe(expected);
  });

  it.each(['30d', 'now', 'now-0d', 'now+7d', 'now-7', 'now-7x'])('rejects %s', (value) => {
    expect(parseRelativeFromMinutes(value)).toBeUndefined();
  });
});

describe('validateRelativeSignalWindow', () => {
  it('accepts date math relative to now', () => {
    expect(validateRelativeSignalWindow('now-30d')).toBeUndefined();
  });

  it('rejects anything else', () => {
    expect(validateRelativeSignalWindow('30d')).toMatch(/date math relative to now/);
  });
});

describe('validateAbsoluteSignalWindow', () => {
  it('accepts an ISO date', () => {
    expect(validateAbsoluteSignalWindow('2026-01-31T00:00:00.000Z')).toBeUndefined();
  });

  it('rejects an unparseable date', () => {
    expect(validateAbsoluteSignalWindow('last tuesday')).toMatch(/ISO 8601/);
  });
});

describe('validateSignalWindowCoversInterval', () => {
  it('accepts a window longer than the interval', () => {
    expect(
      validateSignalWindowCoversInterval('24h', { type: 'relative', from: 'now-30d' })
    ).toBeUndefined();
  });

  it('accepts a window exactly equal to the interval', () => {
    expect(
      validateSignalWindowCoversInterval('24h', { type: 'relative', from: 'now-1d' })
    ).toBeUndefined();
  });

  it('rejects a window shorter than the interval, which would drop signals between runs', () => {
    expect(validateSignalWindowCoversInterval('24h', { type: 'relative', from: 'now-1h' })).toMatch(
      /must cover at least one schedule interval/
    );
  });

  it('accepts any absolute window, since "since <date>" is open-ended', () => {
    expect(
      validateSignalWindowCoversInterval('7d', {
        type: 'absolute',
        from: '2026-01-31T00:00:00.000Z',
      })
    ).toBeUndefined();
  });

  it('defers to the per-field validators when either value is malformed', () => {
    expect(
      validateSignalWindowCoversInterval('nightly', { type: 'relative', from: 'now-1h' })
    ).toBeUndefined();
    expect(
      validateSignalWindowCoversInterval('24h', { type: 'relative', from: 'garbage' })
    ).toBeUndefined();
  });
});
