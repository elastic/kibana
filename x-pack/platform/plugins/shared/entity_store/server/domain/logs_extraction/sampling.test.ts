/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT, MIN_SAMPLING_RATE } from '../saved_objects';
import type { AdaptiveSamplingInputs } from './sampling';
import { computeAdaptiveSamplingRate, resolveSamplingRate } from './sampling';

const DEFAULT_CAP = LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT;

/**
 * A window of `windowMinutes` with the first slice covering `sliceMinutes`. With a uniform
 * `sliceLogCount`, the projected window total is sliceLogCount x (windowMinutes / sliceMinutes).
 */
const WINDOW_START = Date.parse('2026-01-01T00:00:00.000Z');
const atMinute = (minutes: number): string =>
  new Date(WINDOW_START + minutes * 60_000).toISOString();

const uniformWindowInputs = ({
  sliceLogCount,
  scannedLogs = 0,
  sliceMinutes = 6,
  windowMinutes = 60,
}: {
  sliceLogCount: number;
  scannedLogs?: number;
  sliceMinutes?: number;
  windowMinutes?: number;
}): AdaptiveSamplingInputs => ({
  scannedLogs,
  sliceLogCount,
  sliceStartISO: atMinute(0),
  sliceEndISO: atMinute(sliceMinutes),
  windowEndISO: atMinute(windowMinutes),
});

describe('computeAdaptiveSamplingRate', () => {
  describe('at or below the default cap: never samples', () => {
    it('returns 1 for a window projected at half the default cap', () => {
      // 10 slices of cap/20 each → projected = cap/2
      const rate = computeAdaptiveSamplingRate(
        uniformWindowInputs({ sliceLogCount: DEFAULT_CAP / 20 })
      );

      expect(rate).toBe(1);
    });

    it('returns 1 for a window projected exactly at the default cap', () => {
      // 10 slices of cap/10 each → projected = cap, ratio = 1
      const rate = computeAdaptiveSamplingRate(
        uniformWindowInputs({ sliceLogCount: DEFAULT_CAP / 10 })
      );

      expect(rate).toBe(1);
    });

    it('returns 1 when the slice is empty', () => {
      const rate = computeAdaptiveSamplingRate(uniformWindowInputs({ sliceLogCount: 0 }));

      expect(rate).toBe(1);
    });
  });

  describe('above the default cap: always samples', () => {
    it('returns ~0.5 for a window projected at 2x the default cap', () => {
      const rate = computeAdaptiveSamplingRate(
        uniformWindowInputs({ sliceLogCount: DEFAULT_CAP / 5 })
      );

      expect(rate).toBeCloseTo(0.5);
    });

    it('returns a rate below 1 as soon as the projection exceeds the default cap', () => {
      // 10 slices of (cap/10 + 1) each → projected just above cap
      const rate = computeAdaptiveSamplingRate(
        uniformWindowInputs({ sliceLogCount: DEFAULT_CAP / 10 + 1 })
      );

      expect(rate).toBeLessThan(1);
    });

    it('floors at MIN_SAMPLING_RATE for a window at 50x the default cap', () => {
      const rate = computeAdaptiveSamplingRate(
        uniformWindowInputs({ sliceLogCount: DEFAULT_CAP * 5 })
      );

      expect(rate).toBe(MIN_SAMPLING_RATE);
    });
  });

  describe('budget consumption across slices', () => {
    it('shrinks the rate as scanned logs eat the budget', () => {
      // Half the budget spent; 3-min slice of cap/10 extrapolated over the remaining 27 min
      // estimates a full budget of logs ahead → p = (cap/2) / cap = 0.5
      const rate = computeAdaptiveSamplingRate({
        scannedLogs: DEFAULT_CAP / 2,
        sliceLogCount: DEFAULT_CAP / 10,
        sliceStartISO: '2026-01-01T00:30:00.000Z',
        sliceEndISO: '2026-01-01T00:33:00.000Z',
        windowEndISO: '2026-01-01T01:00:00.000Z',
      });

      expect(rate).toBeCloseTo(0.5);
    });

    it('floors when the budget is already exhausted', () => {
      const rate = computeAdaptiveSamplingRate(
        uniformWindowInputs({ sliceLogCount: DEFAULT_CAP / 10, scannedLogs: DEFAULT_CAP })
      );

      expect(rate).toBe(MIN_SAMPLING_RATE);
    });
  });

  describe('estimation edge cases', () => {
    it('uses the slice count alone when the slice has no duration', () => {
      const inputs: AdaptiveSamplingInputs = {
        scannedLogs: 0,
        sliceLogCount: DEFAULT_CAP * 2,
        sliceStartISO: '2026-01-01T00:00:00.000Z',
        sliceEndISO: '2026-01-01T00:00:00.000Z',
        windowEndISO: '2026-01-01T01:00:00.000Z',
      };

      expect(computeAdaptiveSamplingRate(inputs)).toBeCloseTo(0.5);
    });

    it('does not extrapolate past the window end for the final slice', () => {
      // Slice ends exactly at the window end: projection = slice count only
      const inputs: AdaptiveSamplingInputs = {
        scannedLogs: 0,
        sliceLogCount: DEFAULT_CAP / 2,
        sliceStartISO: '2026-01-01T00:54:00.000Z',
        sliceEndISO: '2026-01-01T01:00:00.000Z',
        windowEndISO: '2026-01-01T01:00:00.000Z',
      };

      expect(computeAdaptiveSamplingRate(inputs)).toBe(1);
    });
  });
});

describe('resolveSamplingRate', () => {
  it('override applies even when the window is far below the default cap', () => {
    const rate = resolveSamplingRate(uniformWindowInputs({ sliceLogCount: 10 }), 0.5);

    expect(rate).toBe(0.5);
  });

  it('override wins over the dynamic rate', () => {
    const inputs = uniformWindowInputs({ sliceLogCount: DEFAULT_CAP * 5 }); // dynamic would floor at 0.1

    expect(resolveSamplingRate(inputs, 0.8)).toBe(0.8);
  });

  it('override is clamped to the sampling bounds', () => {
    const inputs = uniformWindowInputs({ sliceLogCount: 10 });

    expect(resolveSamplingRate(inputs, 0.01)).toBe(MIN_SAMPLING_RATE);
    expect(resolveSamplingRate(inputs, 5)).toBe(1);
  });

  it('null and undefined overrides fall through to the dynamic rate', () => {
    const inputs = uniformWindowInputs({ sliceLogCount: DEFAULT_CAP / 5 }); // 2x cap → 0.5

    expect(resolveSamplingRate(inputs, null)).toBeCloseTo(0.5);
    expect(resolveSamplingRate(inputs, undefined)).toBeCloseTo(0.5);
    expect(resolveSamplingRate(inputs)).toBeCloseTo(0.5);
  });
});
