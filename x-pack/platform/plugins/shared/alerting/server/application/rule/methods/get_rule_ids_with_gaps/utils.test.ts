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
        sum_unfilled_ms: { value: 100 },
        sum_in_progress_ms: { value: 50 },
        sum_filled_ms: { value: 25 },
        sum_total_ms: { value: 175 },
      };
      expect(extractGapDurationSums(bucket)).toEqual({
        sumUnfilledMs: 100,
        sumInProgressMs: 50,
        sumFilledMs: 25,
        sumTotalMs: 175,
      });
    });

    it('defaults missing fields to 0 and omits sumTotalMs when absent', () => {
      const bucket: GapDurationBucket = {};
      expect(extractGapDurationSums(bucket)).toEqual({
        sumUnfilledMs: 0,
        sumInProgressMs: 0,
        sumFilledMs: 0,
        sumTotalMs: undefined,
      });
    });

    it('treats null values as 0', () => {
      const bucket: GapDurationBucket = {
        sum_unfilled_ms: { value: null },
        sum_in_progress_ms: { value: null },
        sum_filled_ms: { value: null },
        sum_total_ms: { value: null },
      };
      expect(extractGapDurationSums(bucket)).toEqual({
        sumUnfilledMs: 0,
        sumInProgressMs: 0,
        sumFilledMs: 0,
        sumTotalMs: 0,
      });
    });

    it('clamps negative values to 0', () => {
      const bucket: GapDurationBucket = {
        sum_unfilled_ms: { value: -10 },
        sum_in_progress_ms: { value: -1 },
        sum_filled_ms: { value: -5 },
        sum_total_ms: { value: -16 },
      };
      expect(extractGapDurationSums(bucket)).toEqual({
        sumUnfilledMs: 0,
        sumInProgressMs: 0,
        sumFilledMs: 0,
        sumTotalMs: 0,
      });
    });
  });

  describe('calculateAggregatedGapStatus', () => {
    it('returns unfilled when any unfilled ms > 0', () => {
      expect(
        calculateAggregatedGapStatus({
          sumUnfilledMs: 1,
          sumInProgressMs: 0,
          sumFilledMs: 100,
          sumTotalMs: 101,
        })
      ).toBe('unfilled');
    });

    it('returns in_progress when no unfilled and any in_progress > 0', () => {
      expect(
        calculateAggregatedGapStatus({
          sumUnfilledMs: 0,
          sumInProgressMs: 50,
          sumFilledMs: 0,
          sumTotalMs: 50,
        })
      ).toBe('in_progress');
    });

    it('returns filled when no unfilled/in_progress and filled > 0', () => {
      expect(
        calculateAggregatedGapStatus({
          sumUnfilledMs: 0,
          sumInProgressMs: 0,
          sumFilledMs: 10,
          sumTotalMs: 10,
        })
      ).toBe('filled');
    });

    it('returns null when all sums are 0', () => {
      expect(
        calculateAggregatedGapStatus({
          sumUnfilledMs: 0,
          sumInProgressMs: 0,
          sumFilledMs: 0,
          sumTotalMs: 0,
        })
      ).toBeNull();
    });
  });

  describe('COMMON_GAP_AGGREGATIONS', () => {
    it('contains expected sum field mappings', () => {
      expect(COMMON_GAP_AGGREGATIONS.sum_unfilled_ms).toEqual({
        sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
      });
      expect(COMMON_GAP_AGGREGATIONS.sum_in_progress_ms).toEqual({
        sum: { field: 'kibana.alert.rule.gap.in_progress_duration_ms' },
      });
      expect(COMMON_GAP_AGGREGATIONS.sum_filled_ms).toEqual({
        sum: { field: 'kibana.alert.rule.gap.filled_duration_ms' },
      });
      expect(COMMON_GAP_AGGREGATIONS.sum_total_ms).toEqual({
        sum: { field: 'kibana.alert.rule.gap.total_gap_duration_ms' },
      });
    });
  });
});
