/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elapsedMs, roundMs, startHrtime } from './clock';

describe('telemetry/clock', () => {
  describe('roundMs', () => {
    it('rounds to 3 decimal places', () => {
      expect(roundMs(1.23456)).toBe(1.235);
      expect(roundMs(1.23444)).toBe(1.234);
    });

    it('leaves whole numbers untouched', () => {
      expect(roundMs(0)).toBe(0);
      expect(roundMs(42)).toBe(42);
    });

    it('handles fractional values under a microsecond', () => {
      expect(roundMs(0.0001)).toBe(0);
      expect(roundMs(0.0005)).toBe(0.001);
    });

    it('preserves sign', () => {
      expect(roundMs(-1.2345)).toBe(-1.234);
    });
  });

  describe('startHrtime / elapsedMs', () => {
    let spy: jest.SpyInstance<bigint, []>;

    afterEach(() => {
      spy?.mockRestore();
    });

    it('returns monotonic-clock ns resolution from process.hrtime.bigint', () => {
      spy = jest.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(12_345n);
      expect(startHrtime()).toBe(12_345n);
    });

    it('returns elapsed milliseconds between origin and now', () => {
      spy = jest.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(1_500_000n); // now = 1.5 ms after origin
      const origin = 0n;
      expect(elapsedMs(origin)).toBe(1.5);
    });

    it('returns 0 when origin equals now', () => {
      const origin = 42n;
      spy = jest.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(origin);
      expect(elapsedMs(origin)).toBe(0);
    });

    it('is immune to wall-clock Date manipulation', () => {
      // Freeze Date; hrtime should still advance independently.
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
      spy = jest.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(2_000_000n);
      expect(elapsedMs(0n)).toBe(2);
      jest.useRealTimers();
    });
  });
});
