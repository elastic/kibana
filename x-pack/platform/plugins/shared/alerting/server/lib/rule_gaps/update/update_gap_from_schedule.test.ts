/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Gap } from '../gap';
import { updateGapFromSchedule } from './update_gap_from_schedule';
import { adHocRunStatus } from '../../../../common/constants';

describe('updateGapFromSchedule', () => {
  const createTestGap = () =>
    new Gap({
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
    });

  describe('schedule processing', () => {
    it('should handle empty schedule', () => {
      const gap = createTestGap();
      const updatedGap = updateGapFromSchedule({
        gap,
        backfillSchedule: [],
      });

      expect(updatedGap.filledIntervals).toHaveLength(0);
      expect(updatedGap.inProgressIntervals).toHaveLength(0);
    });

    it('should update filled intervals for completed backfills', () => {
      const gap = createTestGap();
      const updatedGap = updateGapFromSchedule({
        gap,
        backfillSchedule: [
          {
            runAt: '2024-01-01T00:15:00.000Z',
            interval: '15m',
            status: adHocRunStatus.COMPLETE,
          },
        ],
      });

      expect(updatedGap.filledIntervals).toHaveLength(1);
      expect(updatedGap.filledIntervals[0]).toEqual({
        gte: new Date('2024-01-01T00:00:00.000Z'),
        lte: new Date('2024-01-01T00:15:00.000Z'),
      });
    });

    it('should update in-progress intervals for running backfills', () => {
      const gap = createTestGap();
      const updatedGap = updateGapFromSchedule({
        gap,
        backfillSchedule: [
          {
            runAt: '2024-01-01T00:15:00.000Z',
            interval: '15m',
            status: adHocRunStatus.RUNNING,
          },
        ],
      });

      expect(updatedGap.inProgressIntervals).toHaveLength(1);
      expect(updatedGap.inProgressIntervals[0]).toEqual({
        gte: new Date('2024-01-01T00:00:00.000Z'),
        lte: new Date('2024-01-01T00:15:00.000Z'),
      });
    });
  });

  describe('multiple intervals handling', () => {
    it('should handle overlapping intervals', () => {
      const gap = createTestGap();
      const updatedGap = updateGapFromSchedule({
        gap,
        backfillSchedule: [
          {
            runAt: '2024-01-01T00:15:00.000Z',
            interval: '15m',
            status: adHocRunStatus.COMPLETE,
          },
          {
            runAt: '2024-01-01T00:20:00.000Z',
            interval: '15m',
            status: adHocRunStatus.COMPLETE,
          },
        ],
      });

      expect(updatedGap.filledIntervals).toHaveLength(1);
      expect(updatedGap.filledIntervals[0]).toEqual({
        gte: new Date('2024-01-01T00:00:00.000Z'),
        lte: new Date('2024-01-01T00:20:00.000Z'),
      });
    });

    it('should handle mixed status intervals', () => {
      const gap = createTestGap();
      const updatedGap = updateGapFromSchedule({
        gap,
        backfillSchedule: [
          {
            runAt: '2024-01-01T00:15:00.000Z',
            interval: '15m',
            status: adHocRunStatus.COMPLETE,
          },
          {
            runAt: '2024-01-01T00:30:00.000Z',
            interval: '15m',
            status: adHocRunStatus.RUNNING,
          },
          {
            runAt: '2024-01-01T00:45:00.000Z',
            interval: '15m',
            status: adHocRunStatus.PENDING,
          },
        ],
      });

      expect(updatedGap.filledIntervals).toHaveLength(1);
      expect(updatedGap.inProgressIntervals).toHaveLength(1);
      expect(updatedGap.filledIntervals[0]).toEqual({
        gte: new Date('2024-01-01T00:00:00.000Z'),
        lte: new Date('2024-01-01T00:15:00.000Z'),
      });
      expect(updatedGap.inProgressIntervals[0]).toEqual({
        gte: new Date('2024-01-01T00:15:00.000Z'),
        lte: new Date('2024-01-01T00:45:00.000Z'),
      });
    });
  });

  describe('edge cases', () => {
    it('should handle intervals outside gap range', () => {
      const gap = createTestGap();
      const updatedGap = updateGapFromSchedule({
        gap,
        backfillSchedule: [
          {
            runAt: '2024-01-01T02:00:00.000Z', // Outside gap range
            interval: '15m',
            status: adHocRunStatus.COMPLETE,
          },
        ],
      });

      expect(updatedGap.filledIntervals).toHaveLength(0);
      expect(updatedGap.inProgressIntervals).toHaveLength(0);
    });
  });
});
