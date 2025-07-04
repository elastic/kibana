/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildGapsFilter } from './build_gaps_filter';
import { gapStatus } from '../../../common/constants/gap_status';

describe('buildGapsFilter', () => {
  it('should build base filter when no params provided', () => {
    expect(buildGapsFilter({})).toBe('event.action: gap AND event.provider: alerting');
  });

  it('should build filter with range', () => {
    expect(buildGapsFilter({ start: '2024-01-01', end: '2024-01-02' })).toBe(
      'event.action: gap AND event.provider: alerting AND ' +
        'kibana.alert.rule.gap.range <= "2024-01-02" AND kibana.alert.rule.gap.range >= "2024-01-01"'
    );
  });

  it('should build filter with only end date', () => {
    expect(buildGapsFilter({ end: '2024-01-02' })).toBe(
      'event.action: gap AND event.provider: alerting AND ' +
        'kibana.alert.rule.gap.range <= "2024-01-02"'
    );
  });

  it('should build filter with only start date', () => {
    expect(buildGapsFilter({ start: '2024-01-01' })).toBe(
      'event.action: gap AND event.provider: alerting AND ' +
        'kibana.alert.rule.gap.range >= "2024-01-01"'
    );
  });

  it('should build filter with statuses', () => {
    expect(buildGapsFilter({ statuses: [gapStatus.UNFILLED] })).toBe(
      'event.action: gap AND event.provider: alerting AND ' +
        '(kibana.alert.rule.gap.status : unfilled)'
    );
  });

  it('should build filter with range and statuses', () => {
    expect(
      buildGapsFilter({
        start: '2024-01-01',
        end: '2024-01-02',
        statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
      })
    ).toBe(
      'event.action: gap AND event.provider: alerting AND ' +
        'kibana.alert.rule.gap.range <= "2024-01-02" AND kibana.alert.rule.gap.range >= "2024-01-01" AND ' +
        '(kibana.alert.rule.gap.status : unfilled OR kibana.alert.rule.gap.status : partially_filled)'
    );
  });

  describe('interval filters', () => {
    it('should build filter with hasUnfilledIntervals = true', () => {
      expect(buildGapsFilter({ hasUnfilledIntervals: true })).toBe(
        'event.action: gap AND event.provider: alerting AND ' +
          'kibana.alert.rule.gap.unfilled_intervals: *'
      );
    });

    it('should build filter with hasUnfilledIntervals = false', () => {
      expect(buildGapsFilter({ hasUnfilledIntervals: false })).toBe(
        'event.action: gap AND event.provider: alerting AND ' +
          'NOT kibana.alert.rule.gap.unfilled_intervals: *'
      );
    });

    it('should build filter with hasInProgressIntervals = true', () => {
      expect(buildGapsFilter({ hasInProgressIntervals: true })).toBe(
        'event.action: gap AND event.provider: alerting AND ' +
          'kibana.alert.rule.gap.in_progress_intervals: *'
      );
    });

    it('should build filter with hasInProgressIntervals = false', () => {
      expect(buildGapsFilter({ hasInProgressIntervals: false })).toBe(
        'event.action: gap AND event.provider: alerting AND ' +
          'NOT kibana.alert.rule.gap.in_progress_intervals: *'
      );
    });

    it('should build filter with hasFilledIntervals = true', () => {
      expect(buildGapsFilter({ hasFilledIntervals: true })).toBe(
        'event.action: gap AND event.provider: alerting AND ' +
          'kibana.alert.rule.gap.filled_intervals: *'
      );
    });

    it('should build filter with hasFilledIntervals = false', () => {
      expect(buildGapsFilter({ hasFilledIntervals: false })).toBe(
        'event.action: gap AND event.provider: alerting AND ' +
          'NOT kibana.alert.rule.gap.filled_intervals: *'
      );
    });

    it('should build filter with multiple interval filters', () => {
      expect(
        buildGapsFilter({
          hasUnfilledIntervals: true,
          hasInProgressIntervals: false,
          hasFilledIntervals: true,
        })
      ).toBe(
        'event.action: gap AND event.provider: alerting AND ' +
          'kibana.alert.rule.gap.unfilled_intervals: * AND ' +
          'NOT kibana.alert.rule.gap.in_progress_intervals: * AND ' +
          'kibana.alert.rule.gap.filled_intervals: *'
      );
    });

    it('should ignore interval filters when set to undefined', () => {
      expect(
        buildGapsFilter({
          hasUnfilledIntervals: undefined,
          hasInProgressIntervals: undefined,
          hasFilledIntervals: undefined,
        })
      ).toBe('event.action: gap AND event.provider: alerting');
    });

    it('should build complex filter with all parameters', () => {
      expect(
        buildGapsFilter({
          start: '2024-01-01',
          end: '2024-01-02',
          statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
          hasUnfilledIntervals: true,
          hasInProgressIntervals: false,
          hasFilledIntervals: true,
        })
      ).toBe(
        'event.action: gap AND event.provider: alerting AND ' +
          'kibana.alert.rule.gap.range <= "2024-01-02" AND ' +
          'kibana.alert.rule.gap.range >= "2024-01-01" AND ' +
          '(kibana.alert.rule.gap.status : unfilled OR kibana.alert.rule.gap.status : partially_filled) AND ' +
          'kibana.alert.rule.gap.unfilled_intervals: * AND ' +
          'NOT kibana.alert.rule.gap.in_progress_intervals: * AND ' +
          'kibana.alert.rule.gap.filled_intervals: *'
      );
    });
  });
});
