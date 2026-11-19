/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractGapDurationSums,
  calculateHighestPriorityGapFillStatus,
  hasMatchedGapFillStatus,
  RULE_GAP_AGGREGATIONS,
  buildExhaustedRetryGapsAgg,
  getExhaustedRetryGapsInfo,
  type GapDurationBucket,
} from './utils';

jest.mock('../../../lib/rule_gaps/build_gaps_filter', () => ({
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
        key: 'test',
      };
      expect(extractGapDurationSums(bucket)).toEqual({
        totalUnfilledDurationMs: 100,
        totalInProgressDurationMs: 50,
        totalFilledDurationMs: 25,
        totalDurationMs: 175,
      });
    });

    it('defaults missing fields to 0', () => {
      const bucket: GapDurationBucket = { key: 'test' };
      expect(extractGapDurationSums(bucket)).toEqual({
        totalUnfilledDurationMs: 0,
        totalInProgressDurationMs: 0,
        totalFilledDurationMs: 0,
        totalDurationMs: 0,
      });
    });

    it('treats null values as 0', () => {
      const bucket: GapDurationBucket = {
        totalUnfilledDurationMs: { value: null },
        totalInProgressDurationMs: { value: null },
        totalFilledDurationMs: { value: null },
        totalDurationMs: { value: null },
        key: 'test',
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
        key: 'test',
      };
      expect(extractGapDurationSums(bucket)).toEqual({
        totalUnfilledDurationMs: 0,
        totalInProgressDurationMs: 0,
        totalFilledDurationMs: 0,
        totalDurationMs: 0,
      });
    });
  });

  describe('calculateHighestPriorityGapFillStatus', () => {
    it('returns unfilled when any unfilled ms > 0', () => {
      expect(
        calculateHighestPriorityGapFillStatus({
          totalUnfilledDurationMs: 1,
          totalInProgressDurationMs: 0,
          totalFilledDurationMs: 100,
          totalDurationMs: 101,
        })
      ).toBe('unfilled');
    });

    it('returns in_progress when no unfilled and any in_progress > 0', () => {
      expect(
        calculateHighestPriorityGapFillStatus({
          totalUnfilledDurationMs: 0,
          totalInProgressDurationMs: 50,
          totalFilledDurationMs: 0,
          totalDurationMs: 50,
        })
      ).toBe('in_progress');
    });

    it('returns filled when no unfilled/in_progress and filled > 0', () => {
      expect(
        calculateHighestPriorityGapFillStatus({
          totalUnfilledDurationMs: 0,
          totalInProgressDurationMs: 0,
          totalFilledDurationMs: 10,
          totalDurationMs: 10,
        })
      ).toBe('filled');
    });

    it('returns null when all sums are 0', () => {
      expect(
        calculateHighestPriorityGapFillStatus({
          totalUnfilledDurationMs: 0,
          totalInProgressDurationMs: 0,
          totalFilledDurationMs: 0,
          totalDurationMs: 0,
        })
      ).toBeNull();
    });
  });

  describe('RULE_GAP_AGGREGATIONS', () => {
    it('contains expected sum field mappings', () => {
      expect(RULE_GAP_AGGREGATIONS.totalUnfilledDurationMs).toEqual({
        sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
      });
      expect(RULE_GAP_AGGREGATIONS.totalInProgressDurationMs).toEqual({
        sum: { field: 'kibana.alert.rule.gap.in_progress_duration_ms' },
      });
      expect(RULE_GAP_AGGREGATIONS.totalFilledDurationMs).toEqual({
        sum: { field: 'kibana.alert.rule.gap.filled_duration_ms' },
      });
      expect(RULE_GAP_AGGREGATIONS.totalDurationMs).toEqual({
        sum: { field: 'kibana.alert.rule.gap.total_gap_duration_ms' },
      });
    });
  });

  describe('calculateHighestPriorityGapFillStatus - error status', () => {
    it('returns error when hasExhaustedRetryGaps is true', () => {
      expect(
        calculateHighestPriorityGapFillStatus(
          {
            totalUnfilledDurationMs: 100,
            totalInProgressDurationMs: 0,
            totalFilledDurationMs: 50,
            totalDurationMs: 150,
          },
          true
        )
      ).toBe('error');
    });

    it('returns error even when there is also in_progress and filled duration', () => {
      expect(
        calculateHighestPriorityGapFillStatus(
          {
            totalUnfilledDurationMs: 100,
            totalInProgressDurationMs: 50,
            totalFilledDurationMs: 200,
            totalDurationMs: 350,
          },
          true
        )
      ).toBe('error');
    });

    it('returns unfilled when hasExhaustedRetryGaps is false', () => {
      expect(
        calculateHighestPriorityGapFillStatus(
          {
            totalUnfilledDurationMs: 100,
            totalInProgressDurationMs: 0,
            totalFilledDurationMs: 0,
            totalDurationMs: 100,
          },
          false
        )
      ).toBe('unfilled');
    });

    it('defaults hasExhaustedRetryGaps to false when not provided', () => {
      expect(
        calculateHighestPriorityGapFillStatus({
          totalUnfilledDurationMs: 100,
          totalInProgressDurationMs: 0,
          totalFilledDurationMs: 0,
          totalDurationMs: 100,
        })
      ).toBe('unfilled');
    });
  });

  describe('buildExhaustedRetryGapsAgg', () => {
    it('builds a filter agg with the correct numRetries threshold', () => {
      const result = buildExhaustedRetryGapsAgg({ enabled: true, numRetries: 3 });
      expect(result).toEqual({
        exhaustedRetryGaps: {
          filter: {
            bool: {
              must: [
                { range: { 'kibana.alert.rule.gap.unfilled_duration_ms': { gt: 0 } } },
                {
                  range: {
                    'kibana.alert.rule.gap.failed_auto_fill_attempts': { gte: 3 },
                  },
                },
              ],
            },
          },
          aggs: {
            totalUnfilledDurationMs: {
              sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
            },
          },
        },
      });
    });

    it('uses the provided numRetries value', () => {
      const result = buildExhaustedRetryGapsAgg({ enabled: true, numRetries: 7 });
      const filter = result.exhaustedRetryGaps.filter.bool.must[1];
      expect(filter).toEqual({
        range: {
          'kibana.alert.rule.gap.failed_auto_fill_attempts': { gte: 7 },
        },
      });
    });
  });

  describe('getExhaustedRetryGapsInfo', () => {
    it('returns hasExhaustedRetryGaps=true and duration when gaps exist', () => {
      const bucket = {
        exhaustedRetryGaps: {
          doc_count: 2,
          totalUnfilledDurationMs: { value: 300 },
        },
      };
      expect(getExhaustedRetryGapsInfo(bucket)).toEqual({
        hasExhaustedRetryGaps: true,
        exhaustedRetryUnfilledDurationMs: 300,
      });
    });

    it('returns hasExhaustedRetryGaps=false and 0 duration when no gaps match', () => {
      const bucket = {
        exhaustedRetryGaps: {
          doc_count: 0,
          totalUnfilledDurationMs: { value: 0 },
        },
      };
      expect(getExhaustedRetryGapsInfo(bucket)).toEqual({
        hasExhaustedRetryGaps: false,
        exhaustedRetryUnfilledDurationMs: 0,
      });
    });

    it('handles missing exhaustedRetryGaps field', () => {
      expect(getExhaustedRetryGapsInfo({})).toEqual({
        hasExhaustedRetryGaps: false,
        exhaustedRetryUnfilledDurationMs: 0,
      });
    });

    it('handles missing sub-agg value', () => {
      const bucket = {
        exhaustedRetryGaps: {
          doc_count: 1,
        },
      };
      expect(getExhaustedRetryGapsInfo(bucket)).toEqual({
        hasExhaustedRetryGaps: true,
        exhaustedRetryUnfilledDurationMs: 0,
      });
    });
  });

  describe('hasMatchedGapFillStatus', () => {
    it('returns true when the gap fill status of the bucket matches the given gap fill statuses', () => {
      expect(
        hasMatchedGapFillStatus({ key: 'test', totalUnfilledDurationMs: { value: 1 } }, [
          'unfilled',
        ])
      ).toBe(true);
    });

    it('returns false when the gap fill status of the bucket does not match the given gap fill statuses', () => {
      expect(
        hasMatchedGapFillStatus({ key: 'test', totalUnfilledDurationMs: { value: 1 } }, ['filled'])
      ).toBe(false);
    });

    it('matches error status when hasExhaustedRetryGaps is true', () => {
      expect(
        hasMatchedGapFillStatus(
          { key: 'test', totalUnfilledDurationMs: { value: 1 } },
          ['error'],
          true
        )
      ).toBe(true);
    });

    it('does not match error when hasExhaustedRetryGaps is false', () => {
      expect(
        hasMatchedGapFillStatus(
          { key: 'test', totalUnfilledDurationMs: { value: 1 } },
          ['error'],
          false
        )
      ).toBe(false);
    });
  });
});
