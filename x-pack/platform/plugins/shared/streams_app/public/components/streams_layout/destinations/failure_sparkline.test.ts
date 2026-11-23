/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeliverySeriesView } from '../../../services/unit_stats_client/types';
import { downsample, MAX_SPARKLINE_POINTS, toPercentagePoints } from './failure_sparkline';

const MINUTE_MS = 60_000;
const START = Date.parse('2026-11-16T20:00:00.000Z');
const at = (minutes: number) => new Date(START + minutes * MINUTE_MS).toISOString();

const series = (
  points: Array<{
    minutes: number;
    total: number;
    authentication?: number;
    authorization?: number;
  }>
): DeliverySeriesView => ({
  bucketMs: MINUTE_MS,
  unit: '{item}',
  window: { start: at(0), end: at(5) },
  points: points.map(({ minutes, total, authentication = 0, authorization = 0 }) => ({
    start: at(minutes),
    total,
    failed: authentication + authorization,
    authentication,
    authorization,
  })),
});

describe('toPercentagePoints', () => {
  it('is the share of the attempts of each bucket that the class is, in percent, at the start of the bucket', () => {
    const delivery = series([
      { minutes: 0, total: 100, authentication: 10, authorization: 40 },
      { minutes: 1, total: 50, authentication: 25, authorization: 5 },
    ]);

    expect(toPercentagePoints(delivery, 'authentication')).toEqual([
      { x: START, y: 10 },
      { x: START + MINUTE_MS, y: 50 },
    ]);
    expect(toPercentagePoints(delivery, 'authorization')).toEqual([
      { x: START, y: 40 },
      { x: START + MINUTE_MS, y: 10 },
    ]);
  });

  it('is 0 for a bucket that had attempts and none of the class', () => {
    expect(toPercentagePoints(series([{ minutes: 0, total: 20 }]), 'authentication')).toEqual([
      { x: START, y: 0 },
    ]);
  });

  it('has no point for a bucket with no attempts, which is not a share of 0', () => {
    const delivery = series([
      { minutes: 0, total: 10, authentication: 5 },
      { minutes: 1, total: 0 },
      { minutes: 2, total: 10, authentication: 10 },
    ]);

    expect(
      toPercentagePoints(delivery, 'authentication').map(({ x }) => (x - START) / MINUTE_MS)
    ).toEqual([0, 2]);
  });

  it('has no points for a series with no points', () => {
    expect(toPercentagePoints(series([]), 'authentication')).toEqual([]);
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
