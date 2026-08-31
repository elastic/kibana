/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ACTIVITY_TIME_RANGE, resolveGteLte } from './time_range';

const ABSOLUTE_FROM = '2026-08-01T00:00:00.000Z';
const ABSOLUTE_TO = '2026-08-08T00:00:00.000Z';
const NOW = '2026-08-14T12:00:00.000Z';
/** ISO-shaped but out of range, e.g. a hand-edited time range in the URL. */
const MALFORMED = '2026-13-45T00:00:00.000Z';
const DAY_MS = 24 * 60 * 60 * 1000;

describe('resolveGteLte', () => {
  it('resolves absolute ISO bounds', () => {
    expect(resolveGteLte(ABSOLUTE_FROM, ABSOLUTE_TO)).toEqual({
      windowStartMs: Date.parse(ABSOLUTE_FROM),
      windowEndMs: Date.parse(ABSOLUTE_TO),
    });
  });

  describe('against a pinned clock', () => {
    const nowMs = Date.parse(NOW);
    const fallbackWindow = { windowStartMs: nowMs - 7 * DAY_MS, windowEndMs: nowMs };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(NOW));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('resolves the default relative range', () => {
      const { from, to } = DEFAULT_ACTIVITY_TIME_RANGE;
      expect(resolveGteLte(from, to)).toEqual(fallbackWindow);
    });

    it('falls back to a 7-day window when datemath rejects both bounds outright', () => {
      // Empty strings short-circuit datemath.parse to `undefined`.
      expect(resolveGteLte('', '')).toEqual(fallbackWindow);
    });

    it('falls back to a 7-day window when both bounds parse to an invalid date', () => {
      // An invalid moment yields NaN from `valueOf()` rather than `undefined`.
      expect(resolveGteLte(MALFORMED, MALFORMED)).toEqual(fallbackWindow);
    });

    it('falls back per bound, keeping the parseable one', () => {
      expect(resolveGteLte(MALFORMED, ABSOLUTE_TO)).toEqual({
        windowStartMs: nowMs - 7 * DAY_MS,
        windowEndMs: Date.parse(ABSOLUTE_TO),
      });
      expect(resolveGteLte(ABSOLUTE_FROM, MALFORMED)).toEqual({
        windowStartMs: Date.parse(ABSOLUTE_FROM),
        windowEndMs: nowMs,
      });
    });
  });
});
