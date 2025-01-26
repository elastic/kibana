/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Gap } from '.'; // Adjust this import path as needed
import { gapStatus } from '../../../../common/constants'; // Adjust as needed
import { Interval, StringInterval } from '../types'; // Adjust as needed

// Helper function to create Interval objects from ISO strings
function toInterval(gte: string, lte: string): Interval {
  return {
    gte: new Date(gte),
    lte: new Date(lte),
  };
}

describe('Gap Class Tests', () => {
  const HOUR_MS = 60 * 60 * 1000;
  const baseRange: StringInterval = {
    gte: '2024-01-01T00:00:00.000Z',
    lte: '2024-01-01T01:00:00.000Z',
  };

  it('initializes with no filled or in-progress intervals', () => {
    const gap = new Gap({ range: baseRange });
    expect(gap.status).toBe(gapStatus.UNFILLED);
    expect(gap.filledIntervals).toHaveLength(0);
    expect(gap.inProgressIntervals).toHaveLength(0);
    expect(gap.unfilledIntervals).toHaveLength(1);
    expect(gap.unfilledIntervals[0].gte.getTime()).toBe(new Date(baseRange.gte).getTime());
    expect(gap.unfilledIntervals[0].lte.getTime()).toBe(new Date(baseRange.lte).getTime());
    expect(gap.totalGapDurationMs).toBe(HOUR_MS);
    expect(gap.unfilledGapDurationMs).toBe(HOUR_MS);
  });

  it('initializes fully filled gap', () => {
    const gap = new Gap({ range: baseRange, filledIntervals: [baseRange] });
    expect(gap.filledIntervals).toHaveLength(1);
    expect(gap.filledGapDurationMs).toBe(HOUR_MS);
    expect(gap.unfilledGapDurationMs).toBe(0);
    expect(gap.inProgressIntervals).toHaveLength(0);
    expect(gap.status).toBe(gapStatus.FILLED);
  });

  it('initializes partially filled', () => {
    const partialFill: StringInterval = {
      gte: '2024-01-01T00:15:00.000Z',
      lte: '2024-01-01T00:30:00.000Z',
    };
    const gap = new Gap({ range: baseRange, filledIntervals: [partialFill] });
    const filledDuration = (30 - 15) * 60 * 1000; // 15 min

    expect(gap.filledGapDurationMs).toBe(filledDuration);
    expect(gap.unfilledGapDurationMs).toBe(HOUR_MS - filledDuration);
    expect(gap.inProgressGapDurationMs).toBe(0);
    expect(gap.status).toBe(gapStatus.PARTIALLY_FILLED);
  });

  it('initializes with in-progress intervals only', () => {
    const inProgress: StringInterval = {
      gte: '2024-01-01T00:40:00.000Z',
      lte: '2024-01-01T00:50:00.000Z',
    };
    const gap = new Gap({ range: baseRange, inProgressIntervals: [inProgress] });

    const inProgressDuration = (50 - 40) * 60 * 1000; // 10 min
    expect(gap.inProgressGapDurationMs).toBe(inProgressDuration);
    expect(gap.filledGapDurationMs).toBe(0);
    expect(gap.unfilledGapDurationMs).toBe(HOUR_MS - inProgressDuration);
    expect(gap.status).toBe(gapStatus.UNFILLED);
  });

  it('handles intervals that extend beyond the range', () => {
    const extendedInterval: Interval = {
      gte: new Date('2023-12-31T23:50:00.000Z'),
      lte: new Date('2024-01-01T01:10:00.000Z'),
    };
    const gap = new Gap({ range: baseRange });
    gap.fillGap(extendedInterval);
    // Extended interval should effectively fill only the baseRange
    expect(gap.filledGapDurationMs).toBe(HOUR_MS);
    expect(gap.status).toBe(gapStatus.FILLED);
  });

  it('filling the gap after initialization updates the state', () => {
    const gap = new Gap({ range: baseRange });
    const oneMinute = toInterval('2024-01-01T00:00:00.000Z', '2024-01-01T00:01:00.000Z');

    gap.fillGap(oneMinute);
    expect(gap.filledGapDurationMs).toBe(60 * 1000);
    expect(gap.unfilledGapDurationMs).toBe(HOUR_MS - 60 * 1000);
    expect(gap.status).toBe(gapStatus.PARTIALLY_FILLED);
  });

  it('addInProgress intervals do not overlap with already filled', () => {
    const filled: StringInterval = {
      gte: '2024-01-01T00:00:00.000Z',
      lte: '2024-01-01T00:10:00.000Z',
    };
    const gap = new Gap({ range: baseRange, filledIntervals: [filled] });
    const filledDuration = 10 * 60 * 1000;

    // Add in-progress that overlaps from 00:05 - 00:15
    const inProgressOverlap = toInterval('2024-01-01T00:05:00.000Z', '2024-01-01T00:15:00.000Z');
    gap.addInProgress(inProgressOverlap);

    // Should adjust to only non-filled portion: 00:10 - 00:15 (5 min)
    expect(gap.inProgressIntervals).toHaveLength(1);
    expect(gap.inProgressGapDurationMs).toBe(5 * 60 * 1000);
    expect(gap.filledGapDurationMs).toBe(filledDuration);
    expect(gap.status).toBe(gapStatus.PARTIALLY_FILLED);
  });

  it('subsequent fill operations remove portions of in-progress intervals', () => {
    const gap = new Gap({ range: baseRange });
    // Add in-progress for 00:20 - 00:30
    gap.addInProgress(toInterval('2024-01-01T00:20:00.000Z', '2024-01-01T00:30:00.000Z'));
    expect(gap.inProgressGapDurationMs).toBe(10 * 60 * 1000);

    // Fill 5 min of that (00:25 - 00:30)
    gap.fillGap(toInterval('2024-01-01T00:25:00.000Z', '2024-01-01T00:30:00.000Z'));
    expect(gap.filledGapDurationMs).toBe(5 * 60 * 1000);
    // In-progress now only 00:20 - 00:25
    expect(gap.inProgressGapDurationMs).toBe(5 * 60 * 1000);
    expect(gap.status).toBe(gapStatus.PARTIALLY_FILLED);
  });

  it('filling entire gap in multiple steps leads to FILLED status', () => {
    const gap = new Gap({ range: baseRange });

    // Fill first half
    gap.fillGap(toInterval('2024-01-01T00:00:00.000Z', '2024-01-01T00:30:00.000Z'));
    expect(gap.status).toBe(gapStatus.PARTIALLY_FILLED);

    // Fill second half
    gap.fillGap(toInterval('2024-01-01T00:30:00.000Z', '2024-01-01T01:00:00.000Z'));
    expect(gap.status).toBe(gapStatus.FILLED);
    expect(gap.filledGapDurationMs).toBe(HOUR_MS);
  });

  it('returns correct state via getState()', () => {
    const filled: StringInterval = {
      gte: '2024-01-01T00:10:00.000Z',
      lte: '2024-01-01T00:20:00.000Z',
    };
    const inProgress: StringInterval = {
      gte: '2024-01-01T00:20:00.000Z',
      lte: '2024-01-01T00:30:00.000Z',
    };
    const gap = new Gap({
      range: baseRange,
      filledIntervals: [filled],
      inProgressIntervals: [inProgress],
    });

    const state = gap.getState();
    expect(state.range).toEqual(baseRange);
    expect(state.filledIntervals).toHaveLength(1);
    expect(state.inProgressIntervals).toHaveLength(1);
    expect(state.unfilledIntervals).not.toHaveLength(0);
    expect(state.status).toBe(gapStatus.PARTIALLY_FILLED);
    expect(state.totalGapDurationMs).toBe(HOUR_MS);
  });

  it('returns correct ES object via toObject()', () => {
    const filled: StringInterval = {
      gte: '2024-01-01T00:10:00.000Z',
      lte: '2024-01-01T00:20:00.000Z',
    };
    const gap = new Gap({ range: baseRange, filledIntervals: [filled] });

    const esObject = gap.toObject();
    expect(esObject.range).toEqual(baseRange);
    expect(esObject.filled_intervals).toHaveLength(1);
    expect(esObject.in_progress_intervals).toHaveLength(0);
    expect(esObject.unfilled_intervals).toHaveLength(2);
    expect(esObject.status).toBe(gapStatus.PARTIALLY_FILLED);
    expect(esObject.total_gap_duration_ms).toBe(HOUR_MS);
    expect(esObject.filled_duration_ms).toBe(10 * 60 * 1000);
  });

  it('returns correct ES object via toObject() after filling', () => {
    const gap = new Gap({ range: baseRange });

    gap.addInProgress({
      gte: new Date('2024-01-01T00:10:00.000Z'),
      lte: new Date('2024-01-01T00:20:00.000Z'),
    });
    gap.fillGap({
      gte: new Date('2024-01-01T00:40:00.000Z'),
      lte: new Date('2024-01-01T00:50:00.000Z'),
    });

    const esObject = gap.toObject();
    expect(esObject.range).toEqual(baseRange);
    expect(esObject.filled_intervals).toHaveLength(1);
    expect(esObject.in_progress_intervals).toHaveLength(1);
    expect(esObject.unfilled_intervals).toHaveLength(3);
    expect(esObject.status).toBe(gapStatus.PARTIALLY_FILLED);
    expect(esObject.total_gap_duration_ms).toBe(HOUR_MS);
    expect(esObject.in_progress_duration_ms).toBe(10 * 60 * 1000);
    expect(esObject.filled_duration_ms).toBe(10 * 60 * 1000);
  });

  it('handles internalFields information if provided', () => {
    const internalFields = {
      _id: 'test_id',
      _index: 'test_index',
      _seq_no: 1,
      _primary_term: 1,
    };
    const gap = new Gap({ range: baseRange, internalFields });
    expect(gap.internalFields).toEqual(internalFields);
  });
});
