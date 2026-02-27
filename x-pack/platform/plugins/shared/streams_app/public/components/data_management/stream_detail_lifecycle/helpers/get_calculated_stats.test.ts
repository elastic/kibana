/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { TimeState } from '@kbn/es-query';
import { getCalculatedStats } from './get_calculated_stats';

const createTimeState = (start: number, end: number): TimeState => ({
  start,
  end,
  timeRange: { from: new Date(start).toISOString(), to: new Date(end).toISOString() },
  asAbsoluteTimeRange: {
    from: new Date(start).toISOString(),
    to: new Date(end).toISOString(),
    mode: 'absolute',
  },
});

describe('getCalculatedStats', () => {
  const baseTimeState = createTimeState(
    moment('2024-01-01').valueOf(),
    moment('2024-01-08').valueOf()
  );

  describe('when buckets is undefined', () => {
    it('should return zeros', () => {
      const result = getCalculatedStats({
        stats: { totalDocs: 1000, sizeBytes: 10000, creationDate: baseTimeState.start },
        timeState: baseTimeState,
        buckets: undefined,
      });

      expect(result).toEqual({ bytesPerDoc: 0, bytesPerDay: 0, perDayDocs: 0 });
    });
  });

  describe('when buckets is empty', () => {
    it('should return zeros for bytesPerDay since no documents exist', () => {
      const result = getCalculatedStats({
        stats: { totalDocs: 1000, sizeBytes: 10000 },
        timeState: baseTimeState,
        buckets: [],
      });

      expect(result.bytesPerDoc).toBe(10);
      expect(result.bytesPerDay).toBe(0);
      expect(result.perDayDocs).toBe(0);
    });
  });

  describe('effective start calculation', () => {
    const buckets = [
      { key: moment('2024-01-02').valueOf(), doc_count: 300 },
      { key: moment('2024-01-03').valueOf(), doc_count: 400 },
    ];

    it('should use timeState.start when no creationDate is provided', () => {
      const result = getCalculatedStats({
        stats: { totalDocs: 1000, sizeBytes: 10000 },
        timeState: baseTimeState,
        buckets,
      });

      // 700 docs over 7 days = 100 docs/day
      // bytesPerDoc = 10, so bytesPerDay = 10 * 100 = 1000
      expect(result.bytesPerDoc).toBe(10);
      expect(result.bytesPerDay).toBe(1000);
    });

    it('should use creationDate when it falls within timeState range', () => {
      const creationDate = moment('2024-01-03').valueOf();
      const result = getCalculatedStats({
        stats: { totalDocs: 1000, sizeBytes: 10000, creationDate },
        timeState: baseTimeState,
        buckets,
      });

      // 700 docs over 5 days (Jan 3 to Jan 8) = 140 docs/day
      // bytesPerDoc = 10, so bytesPerDay = 10 * 140 = 1400
      expect(result.bytesPerDoc).toBe(10);
      expect(result.bytesPerDay).toBe(1400);
    });

    it('should use timeState.start when creationDate is before timeState.start', () => {
      const creationDate = moment('2023-12-15').valueOf();
      const result = getCalculatedStats({
        stats: { totalDocs: 1000, sizeBytes: 10000, creationDate },
        timeState: baseTimeState,
        buckets,
      });

      // 700 docs over 7 days = 100 docs/day
      // bytesPerDoc = 10, so bytesPerDay = 1000
      expect(result.bytesPerDoc).toBe(10);
      expect(result.bytesPerDay).toBe(1000);
    });

    it('should use timeState.start when creationDate is after timeState.end and buckets contain documents', () => {
      const creationDate = moment('2024-01-15').valueOf(); // After end
      const bucketsWithDocs = [
        { key: moment('2024-01-02').valueOf(), doc_count: 100 },
        { key: moment('2024-01-05').valueOf(), doc_count: 400 },
        { key: moment('2024-01-07').valueOf(), doc_count: 200 },
      ];

      const result = getCalculatedStats({
        stats: { totalDocs: 5000, sizeBytes: 50000, creationDate },
        timeState: baseTimeState,
        buckets: bucketsWithDocs,
      });

      // creationDate > timeState.end, so effectiveStart = timeState.start
      // 700 docs over 7 days = 100 docs/day
      // bytesPerDoc = 50000/5000 = 10, so bytesPerDay = 10 * 100 = 1000
      expect(result.bytesPerDoc).toBe(10);
      expect(result.bytesPerDay).toBe(1000);
    });
  });

  describe('bytesPerDoc calculation', () => {
    const buckets = [{ key: moment('2024-01-02').valueOf(), doc_count: 700 }];

    it('should calculate bytesPerDoc correctly', () => {
      const result = getCalculatedStats({
        stats: { totalDocs: 2000, sizeBytes: 40000 },
        timeState: baseTimeState,
        buckets,
      });

      expect(result.bytesPerDoc).toBe(20);
    });

    it('should return 0 for bytesPerDoc when totalDocs is missing', () => {
      const result = getCalculatedStats({
        stats: { sizeBytes: 40000 },
        timeState: baseTimeState,
        buckets,
      });

      expect(result.bytesPerDoc).toBe(0);
      expect(result.bytesPerDay).toBe(0);
    });

    it('should return 0 for bytesPerDoc when sizeBytes is missing', () => {
      const result = getCalculatedStats({
        stats: { totalDocs: 2000 },
        timeState: baseTimeState,
        buckets,
      });

      expect(result.bytesPerDoc).toBe(0);
      expect(result.bytesPerDay).toBe(0);
    });

    it('should return 0 for bytesPerDoc when totalDocs is 0', () => {
      const result = getCalculatedStats({
        stats: { totalDocs: 0, sizeBytes: 40000 },
        timeState: baseTimeState,
        buckets,
      });

      expect(result.bytesPerDoc).toBe(0);
    });
  });

  describe('bytesPerDay calculation', () => {
    it('should calculate bytesPerDay correctly for a simple case', () => {
      const buckets = [{ key: moment('2024-01-02').valueOf(), doc_count: 700 }];

      const result = getCalculatedStats({
        stats: { totalDocs: 1000, sizeBytes: 10000 },
        timeState: baseTimeState,
        buckets,
      });

      // 700 docs over 7 days = 100 docs/day
      // bytesPerDoc = 10, so bytesPerDay = 10 * 100 = 1000
      expect(result.bytesPerDoc).toBe(10);
      expect(result.bytesPerDay).toBe(1000);
    });

    it('should sum doc_count from all buckets', () => {
      const buckets = [
        { key: moment('2024-01-02').valueOf(), doc_count: 100 },
        { key: moment('2024-01-03').valueOf(), doc_count: 200 },
        { key: moment('2024-01-04').valueOf(), doc_count: 150 },
        { key: moment('2024-01-05').valueOf(), doc_count: 250 },
      ];

      const result = getCalculatedStats({
        stats: { totalDocs: 1000, sizeBytes: 10000 },
        timeState: baseTimeState,
        buckets,
      });

      // 700 docs over 7 days = 100 docs/day
      // bytesPerDoc = 10, so bytesPerDay = 1000
      expect(result.bytesPerDay).toBe(1000);
    });

    it('should handle fractional days correctly', () => {
      const timeState = createTimeState(
        moment('2024-01-01T00:00:00').valueOf(),
        moment('2024-01-01T12:00:00').valueOf() // 0.5 days
      );
      const buckets = [{ key: moment('2024-01-01T06:00:00').valueOf(), doc_count: 100 }];

      const result = getCalculatedStats({
        stats: { totalDocs: 1000, sizeBytes: 10000 },
        timeState,
        buckets,
      });

      // 100 docs over 0.5 days = 200 docs/day
      // bytesPerDoc = 10, so bytesPerDay = 2000
      expect(result.bytesPerDoc).toBe(10);
      expect(result.bytesPerDay).toBe(2000);
    });
  });
});
