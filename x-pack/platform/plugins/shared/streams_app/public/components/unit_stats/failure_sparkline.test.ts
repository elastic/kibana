/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailureSeriesView } from '../../services/unit_stats_client/types';
import { downsample, fillBuckets, MAX_SPARKLINE_POINTS } from './failure_sparkline';

const MINUTE_MS = 60_000;
const START = Date.parse('2026-11-16T20:00:00.000Z');
const at = (minutes: number) => new Date(START + minutes * MINUTE_MS).toISOString();

const series = (
  points: Array<[number, number]>,
  { windowMinutes = 5, bucketMs = MINUTE_MS }: { windowMinutes?: number; bucketMs?: number } = {}
): FailureSeriesView => ({
  bucketMs,
  window: { start: at(0), end: at(windowMinutes) },
  points: points.map(([minutes, value]) => ({ start: at(minutes), value })),
});

describe('fillBuckets', () => {
  it('has a bucket for every step of the window, with 0 where the series has no point', () => {
    expect(
      fillBuckets(
        series([
          [1, 4],
          [3, 2],
        ])
      )
    ).toEqual([
      { x: START, y: 0 },
      { x: START + MINUTE_MS, y: 4 },
      { x: START + 2 * MINUTE_MS, y: 0 },
      { x: START + 3 * MINUTE_MS, y: 2 },
      { x: START + 4 * MINUTE_MS, y: 0 },
    ]);
  });

  it('draws a series with no points as 0 over the whole window', () => {
    expect(fillBuckets(series([])).map(({ y }) => y)).toEqual([0, 0, 0, 0, 0]);
  });

  it('puts a point in the bucket that contains it, when the window starts inside a bucket', () => {
    const offset = 20_000;
    const filled = fillBuckets({
      bucketMs: MINUTE_MS,
      window: {
        start: new Date(START + offset).toISOString(),
        end: new Date(START + 2 * MINUTE_MS + offset).toISOString(),
      },
      points: [{ start: at(1), value: 7 }],
    });

    expect(filled).toEqual([
      { x: START, y: 0 },
      { x: START + MINUTE_MS, y: 7 },
      { x: START + 2 * MINUTE_MS, y: 0 },
    ]);
  });
});

describe('downsample', () => {
  const line = (length: number) =>
    Array.from({ length }, (_, index) => ({ x: index * MINUTE_MS, y: index }));

  it('does not change a series that is short enough', () => {
    const short = line(MAX_SPARKLINE_POINTS);

    expect(downsample(short)).toBe(short);
  });

  it('reduces a long series to the most that a sparkline has', () => {
    expect(downsample(line(48))).toHaveLength(MAX_SPARKLINE_POINTS);
  });

  it('takes the mean of the points that each one stands for, at the time of the first', () => {
    const reduced = downsample(line(24));

    expect(reduced[0]).toEqual({ x: 0, y: 0.5 });
    expect(reduced[1]).toEqual({ x: 2 * MINUTE_MS, y: 2.5 });
  });

  it('keeps the shape of a spike', () => {
    const spike = line(36).map((point) => ({ ...point, y: point.x === 18 * MINUTE_MS ? 90 : 0 }));

    const reduced = downsample(spike);

    expect(Math.max(...reduced.map(({ y }) => y))).toBe(30);
    expect(reduced.filter(({ y }) => y > 0)).toHaveLength(1);
  });
});
