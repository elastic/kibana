/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeliverySeriesView } from '../../../services/unit_stats_client/types';
import { toDeliveryBuckets } from './delivery_chart';

const MINUTE_MS = 60_000;
const START = Date.parse('2026-11-16T20:00:00.000Z');
const at = (minutes: number) => new Date(START + minutes * MINUTE_MS).toISOString();

const series = (
  points: Array<{
    minutes: number;
    total: number;
    failed: number;
    authentication?: number;
    authorization?: number;
  }>,
  windowMinutes = 4
): DeliverySeriesView => ({
  bucketMs: MINUTE_MS,
  unit: '{item}',
  window: { start: at(0), end: at(windowMinutes) },
  points: points.map(({ minutes, total, failed, authentication = 0, authorization = 0 }) => ({
    start: at(minutes),
    total,
    failed,
    authentication,
    authorization,
  })),
});

describe('toDeliveryBuckets', () => {
  it('splits a bucket into delivered, the two classes, and the failures of other causes', () => {
    const [bucket] = toDeliveryBuckets(
      series([{ minutes: 0, total: 100, failed: 40, authentication: 10, authorization: 25 }], 1)
    );

    expect(bucket).toEqual({
      x: START,
      delivered: 60,
      authentication: 10,
      authorization: 25,
      other: 5,
    });
  });

  it('adds up to the total of the bucket', () => {
    const buckets = toDeliveryBuckets(
      series([{ minutes: 0, total: 100, failed: 40, authentication: 10, authorization: 25 }], 1)
    );
    const [{ delivered, authentication, authorization, other }] = buckets;

    expect(delivered + authentication + authorization + other).toBe(100);
  });

  it('has a bucket of 0 for every step of the window that has no point', () => {
    const buckets = toDeliveryBuckets(series([{ minutes: 2, total: 10, failed: 0 }]));

    expect(buckets.map(({ x }) => x)).toEqual(
      [0, 1, 2, 3].map((index) => START + index * MINUTE_MS)
    );
    expect(buckets.map(({ delivered }) => delivered)).toEqual([0, 0, 10, 0]);
    expect(buckets[0]).toEqual({
      x: START,
      delivered: 0,
      authentication: 0,
      authorization: 0,
      other: 0,
    });
  });

  it('never has a negative count when the classes add up to more than failed', () => {
    const [bucket] = toDeliveryBuckets(
      series([{ minutes: 0, total: 10, failed: 5, authentication: 4, authorization: 4 }], 1)
    );

    expect(bucket.other).toBe(0);
  });

  it('never has a negative delivered count when more failed than were attempted', () => {
    const [bucket] = toDeliveryBuckets(series([{ minutes: 0, total: 5, failed: 8 }], 1));

    expect(bucket.delivered).toBe(0);
  });
});
