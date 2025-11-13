/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractGapDurationSums,
  calculateAggregatedGapStatus,
  COMMON_GAP_AGGREGATIONS,
  type GapDurationBucket,
} from './utils';

jest.mock('../../../../lib/rule_gaps/build_gaps_filter', () => ({
  buildGapsFilter: jest.fn(() => 'mocked_filter'),
}));

describe('utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('extractGapDurationSums', () => {
    it('extracts all sums when present', () => {
      const bucket: GapDurationBucket = {
        totalUnfilledDurationMs: { value: 100 },
        totalInProgressDurationMs: { value: 50 },
        totalFilledDurationMs: { value: 25 },
        totalDurationMs: { value: 175 },
      };
      expect(extractGapDurationSums(bucket)).toEqual({
        totalUnfilledDurationMs: 100,
        totalInProgressDurationMs: 50,
        totalFilledDurationMs: 25,
        totalDurationMs: 175,
      });
    });

    it('defaults missing fields to 0 and omits sumTotalMs when absent', () => {
      const bucket: GapDurationBucket = {};
      expect(extractGapDurationSums(bucket)).toEqual({
        totalUnfilledDurationMs: 0,
        totalInProgressDurationMs: 0,
        totalFilledDurationMs: 0,
        totalDurationMs: undefined,
      });
    });

    it('treats null values as 0', () => {
      const bucket: GapDurationBucket = {
        totalUnfilledDurationMs: { value: null },
        totalInProgressDurationMs: { value: null },
        totalFilledDurationMs: { value: null },
        totalDurationMs: { value: null },
      };
      expect(extractGapDurationSums(bucket)).toEqual({
        totalUnfilledDurationMs: 0,
        totalInProgressDurationMs: 0,
        totalFilledDurationMs: 0,
        totalDurationMs: 0,
      });
    });

    it('clamps negative values to 0', () => {
      const bucket: GapDurationBucket = {
        totalUnfilledDurationMs: { value: -10 },
        totalInProgressDurationMs: { value: -1 },
        totalFilledDurationMs: { value: -5 },
        totalDurationMs: { value: -16 },
      };
      expect(extractGapDurationSums(bucket)).toEqual({
        totalUnfilledDurationMs: 0,
        totalInProgressDurationMs: 0,
        totalFilledDurationMs: 0,
        totalDurationMs: 0,
      });
    });
  });

  describe('calculateAggregatedGapStatus', () => {
    it('returns unfilled when any unfilled ms > 0', () => {
      expect(
        calculateAggregatedGapStatus({
          totalUnfilledDurationMs: 1,
          totalInProgressDurationMs: 0,
          totalFilledDurationMs: 100,
          totalDurationMs: 101,
        })
      ).toBe('unfilled');
    });

    it('returns in_progress when no unfilled and any in_progress > 0', () => {
      expect(
        calculateAggregatedGapStatus({
          totalUnfilledDurationMs: 0,
          totalInProgressDurationMs: 50,
          totalFilledDurationMs: 0,
          totalDurationMs: 50,
        })
      ).toBe('in_progress');
    });

    it('returns filled when no unfilled/in_progress and filled > 0', () => {
      expect(
        calculateAggregatedGapStatus({
          totalUnfilledDurationMs: 0,
          totalInProgressDurationMs: 0,
          totalFilledDurationMs: 10,
          totalDurationMs: 10,
        })
      ).toBe('filled');
    });

    it('returns null when all sums are 0', () => {
      expect(
        calculateAggregatedGapStatus({
          totalUnfilledDurationMs: 0,
          totalInProgressDurationMs: 0,
          totalFilledDurationMs: 0,
          totalDurationMs: 0,
        })
      ).toBeNull();
    });
  });

  describe('COMMON_GAP_AGGREGATIONS', () => {
    it('contains expected sum field mappings', () => {
      expect(COMMON_GAP_AGGREGATIONS.totalUnfilledDurationMs).toEqual({
        sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
      });
      expect(COMMON_GAP_AGGREGATIONS.totalInProgressDurationMs).toEqual({
        sum: { field: 'kibana.alert.rule.gap.in_progress_duration_ms' },
      });
      expect(COMMON_GAP_AGGREGATIONS.totalFilledDurationMs).toEqual({
        sum: { field: 'kibana.alert.rule.gap.filled_duration_ms' },
      });
      expect(COMMON_GAP_AGGREGATIONS.totalDurationMs).toEqual({
        sum: { field: 'kibana.alert.rule.gap.total_gap_duration_ms' },
      });
    });
  });
});
