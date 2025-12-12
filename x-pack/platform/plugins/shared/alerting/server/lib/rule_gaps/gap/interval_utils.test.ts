/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getOverlap,
  mergeIntervals,
  subtractIntervals,
  subtractAllIntervals,
  intervalDuration,
  sumIntervalsDuration,
  normalizeInterval,
  denormalizeInterval,
  clipInterval,
  clampIntervals,
  clipDateInterval,
} from './interval_utils';
import type { Interval, StringInterval } from '../../../application/gaps/types/intervals';

describe('interval_utils', () => {
  describe('getOverlap', () => {
    it('returns overlapping interval when intervals overlap', () => {
      const i1: Interval = {
        gte: new Date('2025-01-01T12:00:00Z'),
        lte: new Date('2025-01-01T12:30:00Z'),
      };
      const i2: Interval = {
        gte: new Date('2025-01-01T12:15:00Z'),
        lte: new Date('2025-01-01T12:45:00Z'),
      };
      const expected: Interval = {
        gte: new Date('2025-01-01T12:15:00Z'),
        lte: new Date('2025-01-01T12:30:00Z'),
      };
      expect(getOverlap(i1, i2)).toEqual(expected);
    });

    it('returns null when intervals do not overlap', () => {
      const i1: Interval = {
        gte: new Date('2025-01-01T12:00:00Z'),
        lte: new Date('2025-01-01T12:30:00Z'),
      };
      const i2: Interval = {
        gte: new Date('2025-01-01T12:31:00Z'),
        lte: new Date('2025-01-01T13:00:00Z'),
      };
      expect(getOverlap(i1, i2)).toBeNull();
    });
  });

  describe('mergeIntervals', () => {
    it('merges overlapping intervals', () => {
      const intervals: Interval[] = [
        {
          gte: new Date('2025-01-01T12:00:00Z'),
          lte: new Date('2025-01-01T12:10:00Z'),
        },
        {
          gte: new Date('2025-01-01T12:05:00Z'),
          lte: new Date('2025-01-01T12:15:00Z'),
        },
      ];
      const expected: Interval[] = [
        {
          gte: new Date('2025-01-01T12:00:00Z'),
          lte: new Date('2025-01-01T12:15:00Z'),
        },
      ];
      expect(mergeIntervals(intervals)).toEqual(expected);
    });

    it('returns empty array for empty input', () => {
      expect(mergeIntervals([])).toEqual([]);
    });

    it('keeps non-overlapping intervals separate', () => {
      const intervals: Interval[] = [
        {
          gte: new Date('2025-01-01T12:00:00Z'),
          lte: new Date('2025-01-01T12:10:00Z'),
        },
        {
          gte: new Date('2025-01-01T12:20:00Z'),
          lte: new Date('2025-01-01T12:30:00Z'),
        },
      ];
      expect(mergeIntervals(intervals)).toEqual(intervals);
    });
  });

  describe('subtractIntervals', () => {
    it('subtracts an interval from the middle', () => {
      const base: Interval = {
        gte: new Date('2025-01-01T12:00:00Z'),
        lte: new Date('2025-01-01T13:00:00Z'),
      };
      const toSubtract: Interval[] = [
        {
          gte: new Date('2025-01-01T12:20:00Z'),
          lte: new Date('2025-01-01T12:30:00Z'),
        },
      ];
      const expected: Interval[] = [
        {
          gte: new Date('2025-01-01T12:00:00Z'),
          lte: new Date('2025-01-01T12:20:00Z'),
        },
        {
          gte: new Date('2025-01-01T12:30:00Z'),
          lte: new Date('2025-01-01T13:00:00Z'),
        },
      ];
      expect(subtractIntervals(base, toSubtract)).toEqual(expected);
    });

    it('returns empty array when base interval is completely subtracted', () => {
      const base: Interval = {
        gte: new Date('2025-01-01T12:00:00Z'),
        lte: new Date('2025-01-01T12:30:00Z'),
      };
      const toSubtract: Interval[] = [
        {
          gte: new Date('2025-01-01T11:00:00Z'),
          lte: new Date('2025-01-01T13:00:00Z'),
        },
      ];
      expect(subtractIntervals(base, toSubtract)).toEqual([]);
    });
  });

  describe('subtractAllIntervals', () => {
    it('subtracts intervals from multiple base intervals', () => {
      const intervals: Interval[] = [
        {
          gte: new Date('2025-01-01T12:00:00Z'),
          lte: new Date('2025-01-01T12:30:00Z'),
        },
        {
          gte: new Date('2025-01-01T12:40:00Z'),
          lte: new Date('2025-01-01T13:00:00Z'),
        },
      ];
      const toSubtract: Interval[] = [
        {
          gte: new Date('2025-01-01T12:20:00Z'),
          lte: new Date('2025-01-01T12:45:00Z'),
        },
      ];
      const expected: Interval[] = [
        {
          gte: new Date('2025-01-01T12:00:00Z'),
          lte: new Date('2025-01-01T12:20:00Z'),
        },
        {
          gte: new Date('2025-01-01T12:45:00Z'),
          lte: new Date('2025-01-01T13:00:00Z'),
        },
      ];
      expect(subtractAllIntervals(intervals, toSubtract)).toEqual(expected);
    });
  });

  describe('intervalDuration', () => {
    it('calculates duration in milliseconds', () => {
      const interval: Interval = {
        gte: new Date('2025-01-01T12:00:00Z'),
        lte: new Date('2025-01-01T12:10:00Z'),
      };
      // 10 minutes = 600000 milliseconds
      expect(intervalDuration(interval)).toBe(600000);
    });

    it('returns 0 for invalid intervals', () => {
      const interval: Interval = {
        gte: new Date('2025-01-01T12:10:00Z'),
        lte: new Date('2025-01-01T12:00:00Z'),
      };
      expect(intervalDuration(interval)).toBe(0);
    });
  });

  describe('sumIntervalsDuration', () => {
    it('sums durations of multiple intervals', () => {
      const intervals: Interval[] = [
        {
          gte: new Date('2025-01-01T12:00:00Z'),
          lte: new Date('2025-01-01T12:10:00Z'),
        },
        {
          gte: new Date('2025-01-01T12:15:00Z'),
          lte: new Date('2025-01-01T12:20:00Z'),
        },
      ];
      // First interval: 10 minutes = 600000 ms
      // Second interval: 5 minutes = 300000 ms
      // Total: 15 minutes = 900000 ms
      expect(sumIntervalsDuration(intervals)).toBe(900000);
    });

    it('returns 0 for empty array', () => {
      expect(sumIntervalsDuration([])).toBe(0);
    });
  });

  describe('normalizeInterval', () => {
    it('converts string interval to date interval', () => {
      const stringInterval: StringInterval = {
        gte: '2025-01-01T12:00:00Z',
        lte: '2025-01-01T12:30:00Z',
      };
      const expected: Interval = {
        gte: new Date('2025-01-01T12:00:00Z'),
        lte: new Date('2025-01-01T12:30:00Z'),
      };
      expect(normalizeInterval(stringInterval)).toEqual(expected);
    });
  });

  describe('denormalizeInterval', () => {
    it('converts date interval to string interval', () => {
      const interval: Interval = {
        gte: new Date('2025-01-01T12:00:00Z'),
        lte: new Date('2025-01-01T12:30:00Z'),
      };
      const expected: StringInterval = {
        gte: '2025-01-01T12:00:00.000Z',
        lte: '2025-01-01T12:30:00.000Z',
      };
      expect(denormalizeInterval(interval)).toEqual(expected);
    });
  });

  describe('clipInterval', () => {
    it('clips interval to boundary', () => {
      const interval: Interval = {
        gte: new Date('2025-01-01T11:00:00Z'),
        lte: new Date('2025-01-01T13:00:00Z'),
      };
      const boundary: Interval = {
        gte: new Date('2025-01-01T12:00:00Z'),
        lte: new Date('2025-01-01T12:30:00Z'),
      };
      const expected: Interval = {
        gte: new Date('2025-01-01T12:00:00Z'),
        lte: new Date('2025-01-01T12:30:00Z'),
      };
      expect(clipInterval(interval, boundary)).toEqual(expected);
    });

    it('returns null when no overlap with boundary', () => {
      const interval: Interval = {
        gte: new Date('2025-01-01T11:00:00Z'),
        lte: new Date('2025-01-01T11:30:00Z'),
      };
      const boundary: Interval = {
        gte: new Date('2025-01-01T12:00:00Z'),
        lte: new Date('2025-01-01T12:30:00Z'),
      };
      expect(clipInterval(interval, boundary)).toBeNull();
    });
  });

  describe('clampIntervals', () => {
    const toInterval = (start: string, end: string) => ({
      gte: new Date(start),
      lte: new Date(end),
    });

    const buildTestCase = (
      testDescription: string,
      intervals: Interval[],
      boundary: Interval,
      expectedResult: Interval[]
    ) => ({
      testDescription,
      intervals,
      boundary,
      expectedResult,
    });

    const testCases = [
      buildTestCase(
        'when the list of intervals is outside the range on the left, it should return an empty list',
        [
          toInterval('2025-05-09T09:12:09.457Z', '2025-05-09T09:13:09.457Z'),
          toInterval('2025-05-09T09:14:09.457Z', '2025-05-09T09:15:09.457Z'),
        ],
        toInterval('2025-05-09T09:15:09.457Z', '2025-05-09T09:17:09.457Z'),
        []
      ),
      buildTestCase(
        'when the list of intervals overlaps on the left, it should clamp the overlapping interval on the start',
        [
          toInterval('2025-05-09T09:12:09.457Z', '2025-05-09T09:13:09.457Z'),
          toInterval('2025-05-09T09:14:09.457Z', '2025-05-09T09:15:09.457Z'),
        ],
        toInterval('2025-05-09T09:14:50.457Z', '2025-05-09T09:17:09.457Z'),
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
        toInterval('2025-05-09T09:15:50.457Z', '2025-05-09T09:18:09.457Z'),
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
        toInterval('2025-05-09T08:11:50.457Z', '2025-05-09T09:17:09.457Z'),
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
        toInterval('2025-05-09T09:11:50.457Z', '2025-05-09T09:14:55.457Z'),
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
        toInterval('2025-05-09T09:15:09.457Z', '2025-05-09T09:17:09.457Z'),
        []
      ),
    ];

    testCases.forEach(({ testDescription, intervals, boundary, expectedResult }) => {
      it(testDescription, () => {
        expect(clampIntervals(intervals, boundary)).toEqual(expectedResult);
      });
    });
  });

  describe('clipDateInterval', () => {
    it('clips date interval to boundary', () => {
      const expected = {
        start: new Date('2025-01-01T12:00:00Z'),
        end: new Date('2025-01-01T12:30:00Z'),
      };
      expect(
        clipDateInterval(
          new Date('2025-01-01T11:00:00Z'),
          new Date('2025-01-01T13:00:00Z'),
          new Date('2025-01-01T12:00:00Z'),
          new Date('2025-01-01T12:30:00Z')
        )
      ).toEqual(expected);
    });

    it('returns null when no overlap with boundary', () => {
      expect(
        clipDateInterval(
          new Date('2025-01-01T11:00:00Z'),
          new Date('2025-01-01T11:30:00Z'),
          new Date('2025-01-01T12:00:00Z'),
          new Date('2025-01-01T12:30:00Z')
        )
      ).toBeNull();
    });
  });
});
