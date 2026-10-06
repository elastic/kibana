/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectTimeRange, type DatasetTimeRange } from './select_time_range';

const NOW = new Date('2026-06-26T12:00:00.000Z').getTime();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MIN = 60 * 1000;

const dataset = (minMs: number, maxMs: number, index = 'logs-*'): DatasetTimeRange => ({
  index,
  timeField: '@timestamp',
  minMs,
  maxMs,
});

describe('selectTimeRange', () => {
  it('returns undefined when there are no datasets', () => {
    expect(selectTimeRange([], NOW)).toBeUndefined();
  });

  it('returns undefined when no dataset holds usable data', () => {
    expect(selectTimeRange([dataset(NaN, NaN)], NOW)).toBeUndefined();
  });

  describe('live case (newest data within the last 24h -> 24h cap)', () => {
    it('caps the window at 24h when live data spans further back', () => {
      // data spans the last 10 days, still arriving
      expect(selectTimeRange([dataset(NOW - 10 * DAY, NOW - 5 * MIN)], NOW)).toEqual({
        from: 'now-24h',
        to: 'now',
        mode: 'relative',
      });
    });

    it('shrinks to the oldest data for a young dataset', () => {
      expect(selectTimeRange([dataset(NOW - 6 * HOUR, NOW)], NOW)).toEqual({
        from: 'now-6h',
        to: 'now',
        mode: 'relative',
      });
    });

    it('floors a near-instant dataset to a 1h window', () => {
      // a single point 5 minutes ago
      expect(selectTimeRange([dataset(NOW - 5 * MIN, NOW - 5 * MIN)], NOW)).toEqual({
        from: 'now-1h',
        to: 'now',
        mode: 'relative',
      });
    });

    it('treats data exactly at the live boundary as live', () => {
      expect(selectTimeRange([dataset(NOW - 10 * DAY, NOW - DAY)], NOW)).toEqual({
        from: 'now-24h',
        to: 'now',
        mode: 'relative',
      });
    });
  });

  describe('recent case (newest data older than 24h but within the cap -> anchor to now)', () => {
    it('reaches back to the data instead of keeping the 24h cap', () => {
      // max just past the live boundary, min 10d ago
      expect(selectTimeRange([dataset(NOW - 10 * DAY, NOW - DAY - MIN)], NOW)).toEqual({
        from: 'now-10d/d',
        to: 'now',
        mode: 'relative',
      });
    });

    it('keeps to=now when data ended a few days ago but within the cap', () => {
      // max 3d ago, min 20d ago
      expect(selectTimeRange([dataset(NOW - 20 * DAY, NOW - 3 * DAY)], NOW)).toEqual({
        from: 'now-20d/d',
        to: 'now',
        mode: 'relative',
      });
    });

    it('caps from at 30d when data is older than the cap on the leading edge', () => {
      // max 25d ago (within cap), min 60d ago (older than cap)
      expect(selectTimeRange([dataset(NOW - 60 * DAY, NOW - 25 * DAY)], NOW)).toEqual({
        from: 'now-30d/d',
        to: 'now',
        mode: 'relative',
      });
    });

    it('shrinks a short stale dataset instead of showing 30d of whitespace', () => {
      // a 1-day burst that ended 2 days ago
      expect(selectTimeRange([dataset(NOW - 3 * DAY, NOW - 2 * DAY)], NOW)).toEqual({
        from: 'now-3d/d',
        to: 'now',
        mode: 'relative',
      });
    });

    it('treats data exactly at the cap boundary as current', () => {
      expect(selectTimeRange([dataset(NOW - 30 * DAY, NOW - 30 * DAY)], NOW)).toEqual({
        from: 'now-30d/d',
        to: 'now',
        mode: 'relative',
      });
    });
  });

  describe('historical case (newest data older than the cap -> anchor to data)', () => {
    it('anchors an absolute window to the newest data when data ended months ago', () => {
      const max = NOW - 60 * DAY;
      const min = max - DAY;
      expect(selectTimeRange([dataset(min, max)], NOW)).toEqual({
        from: new Date(min).toISOString(),
        // `to` is padded +1ms past the newest timestamp (exclusive `?_tend`).
        to: new Date(max + 1).toISOString(),
        mode: 'absolute',
      });
    });

    it('caps the historical window at 2d for a wide fully-historical dataset', () => {
      const min = new Date('2021-01-01T00:00:00.000Z').getTime();
      const max = new Date('2021-12-31T23:59:59.000Z').getTime();
      expect(selectTimeRange([dataset(min, max)], NOW)).toEqual({
        from: new Date(max - 2 * DAY).toISOString(),
        to: new Date(max + 1).toISOString(),
        mode: 'absolute',
      });
    });

    it('treats data just past the cap boundary as historical', () => {
      const max = NOW - (30 * DAY + MIN);
      const min = max - 2 * DAY;
      expect(selectTimeRange([dataset(min, max)], NOW)).toEqual({
        from: new Date(min).toISOString(),
        to: new Date(max + 1).toISOString(),
        mode: 'absolute',
      });
    });

    it('floors a historical single-point dataset to a 1h window', () => {
      const point = new Date('2021-06-01T12:00:00.000Z').getTime();
      expect(selectTimeRange([dataset(point, point)], NOW)).toEqual({
        from: new Date(point - HOUR).toISOString(),
        to: new Date(point + 1).toISOString(),
        mode: 'absolute',
      });
    });

    it('uses a 1h minimum window for narrow historical data', () => {
      const max = NOW - 31 * DAY;
      const min = max - 30 * MIN;
      expect(selectTimeRange([dataset(min, max)], NOW)).toEqual({
        from: new Date(max - HOUR).toISOString(),
        to: new Date(max + 1).toISOString(),
        mode: 'absolute',
      });
    });
  });

  describe('multiple datasets', () => {
    it('anchors on the most recent dataset and drops a disjoint older one', () => {
      const recent = dataset(NOW - 5 * HOUR, NOW - MIN, 'logs-recent');
      const old = dataset(
        new Date('2021-01-01T00:00:00.000Z').getTime(),
        new Date('2021-02-01T00:00:00.000Z').getTime(),
        'logs-2021'
      );
      // old dataset sits entirely before the anchor window and is dropped
      expect(selectTimeRange([recent, old], NOW)).toEqual({
        from: 'now-5h',
        to: 'now',
        mode: 'relative',
      });
    });

    it('keeps the 24h window when a live dataset is mixed with a stale one', () => {
      const live = dataset(NOW - 2 * DAY, NOW - MIN, 'live');
      const stale = dataset(NOW - 10 * DAY, NOW - 3 * DAY, 'stale');
      // the live dataset wins; the stale one falls outside the 24h window
      expect(selectTimeRange([live, stale], NOW)).toEqual({
        from: 'now-24h',
        to: 'now',
        mode: 'relative',
      });
    });

    it('widens from to cover an overlapping second dataset when none is live', () => {
      const a = dataset(NOW - 20 * DAY, NOW - 2 * DAY, 'a');
      const b = dataset(NOW - 10 * DAY, NOW - 5 * DAY, 'b');
      // both overlap the anchor window; from widens to the oldest (20d)
      expect(selectTimeRange([a, b], NOW)).toEqual({
        from: 'now-20d/d',
        to: 'now',
        mode: 'relative',
      });
    });

    it('ignores dataset order', () => {
      const a = dataset(NOW - 20 * DAY, NOW - 2 * DAY, 'a');
      const b = dataset(NOW - 10 * DAY, NOW - 5 * DAY, 'b');
      expect(selectTimeRange([b, a], NOW)).toEqual(selectTimeRange([a, b], NOW));
    });
  });
});
