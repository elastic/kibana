/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clampIntervalsForScheduling } from './utils';

type Interval = ReturnType<typeof toInterval>;
const toInterval = (start: string, end: string) => ({ gte: start, lte: end });
const toRange = (start: string, end: string) => ({ start, end });

const buildTestCase = (
  testDescription: string,
  intervals: Interval[],
  range: { start: string; end: string },
  expectedResult: Interval[]
) => ({
  testDescription,
  intervals,
  range,
  expectedResult,
});

const testCases = [
  buildTestCase(
    'when the list of intervals is outside the range on the left, it should return an empty list',
    [
      toInterval('2025-05-09T09:12:09.457Z', '2025-05-09T09:13:09.457Z'),
      toInterval('2025-05-09T09:14:09.457Z', '2025-05-09T09:15:09.457Z'),
    ],
    toRange('2025-05-09T09:15:09.457Z', '2025-05-09T09:17:09.457Z'),
    []
  ),
  buildTestCase(
    'when the list of intervals overlaps on the left, it should clamp the overlapping interval on the start',
    [
      toInterval('2025-05-09T09:12:09.457Z', '2025-05-09T09:13:09.457Z'),
      toInterval('2025-05-09T09:14:09.457Z', '2025-05-09T09:15:09.457Z'),
    ],
    toRange('2025-05-09T09:14:50.457Z', '2025-05-09T09:17:09.457Z'),
    [toInterval('2025-05-09T09:14:50.457Z', '2025-05-09T09:15:09.457Z')]
  ),
  buildTestCase(
    'when the list of intervals overlaps with the range on both left and right, it should clamp the overlapping intervals',
    [
      toInterval('2025-05-09T09:12:09.457Z', '2025-05-09T09:13:09.457Z'),
      toInterval('2025-05-09T09:15:09.457Z', '2025-05-09T09:16:09.457Z'),
      toInterval('2025-05-09T09:17:09.458Z', '2025-05-09T09:20:09.457Z'),
      toInterval('2025-05-09T09:21:09.458Z', '2025-05-09T09:22:09.457Z'),
    ],
    toRange('2025-05-09T09:15:50.457Z', '2025-05-09T09:18:09.457Z'),
    [
      toInterval('2025-05-09T09:15:50.457Z', '2025-05-09T09:16:09.457Z'),
      toInterval('2025-05-09T09:17:09.458Z', '2025-05-09T09:18:09.457Z'),
    ]
  ),
  buildTestCase(
    'when the list of intervals is included inside the range, it should not clamp anything',
    [
      toInterval('2025-05-09T09:12:09.457Z', '2025-05-09T09:13:09.457Z'),
      toInterval('2025-05-09T09:14:09.457Z', '2025-05-09T09:15:09.457Z'),
    ],
    toRange('2025-05-09T08:11:50.457Z', '2025-05-09T09:17:09.457Z'),
    [
      toInterval('2025-05-09T09:12:09.457Z', '2025-05-09T09:13:09.457Z'),
      toInterval('2025-05-09T09:14:09.457Z', '2025-05-09T09:15:09.457Z'),
    ]
  ),
  buildTestCase(
    'when the list of intervals overlaps on the right, it should clamp the overlapping interval on the end',
    [
      toInterval('2025-05-09T09:12:09.457Z', '2025-05-09T09:13:09.457Z'),
      toInterval('2025-05-09T09:14:09.457Z', '2025-05-09T09:15:09.457Z'),
    ],
    toRange('2025-05-09T09:11:50.457Z', '2025-05-09T09:14:55.457Z'),
    [
      toInterval('2025-05-09T09:12:09.457Z', '2025-05-09T09:13:09.457Z'),
      toInterval('2025-05-09T09:14:09.457Z', '2025-05-09T09:14:55.457Z'),
    ]
  ),
  buildTestCase(
    'when the list of intervals is outside the range on the right, it should return an empty list',
    [
      toInterval('2025-05-09T09:18:09.457Z', '2025-05-09T09:20:09.457Z'),
      toInterval('2025-05-09T09:21:09.457Z', '2025-05-09T09:22:09.457Z'),
    ],
    toRange('2025-05-09T09:15:09.457Z', '2025-05-09T09:17:09.457Z'),
    []
  ),
];

describe('clampIntervalsForScheduling', () => {
  testCases.forEach(({ testDescription, intervals, range, expectedResult }) => {
    it(testDescription, () => {
      expect(clampIntervalsForScheduling(intervals, range)).toEqual(expectedResult);
    });
  });
});
