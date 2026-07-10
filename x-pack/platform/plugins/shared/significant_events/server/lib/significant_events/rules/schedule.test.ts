/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CRITICAL_RULE_INTERVAL,
  DEFAULT_RULE_INTERVAL,
  getRuleDetectionSchedule,
  getRuleLookbackInterval,
  getRuleLookbackMs,
  scheduleIntervalForQuery,
} from './schedule';

describe('Significant Events rule scheduling', () => {
  it.each([
    [85, CRITICAL_RULE_INTERVAL],
    [80, CRITICAL_RULE_INTERVAL],
    [60, DEFAULT_RULE_INTERVAL],
    [undefined, DEFAULT_RULE_INTERVAL],
  ])('maps severity %s to interval %s', (severityScore, expectedInterval) => {
    expect(scheduleIntervalForQuery({ severity_score: severityScore })).toBe(expectedInterval);
  });

  it('derives a 2x execution lookback from the rule interval', () => {
    expect(getRuleLookbackInterval('1m')).toBe('2m');
    expect(getRuleLookbackInterval('5m')).toBe('10m');
    expect(getRuleLookbackMs('5m')).toBe(10 * 60 * 1000);
  });

  it('keeps critical detection settings on the existing cadence', () => {
    expect(getRuleDetectionSchedule({ severity_score: 80 })).toEqual({
      interval_minutes: 1,
      recent_activity_minutes: 5,
      bucket_interval: '30s',
      lookback: 'now-30m',
      lookback_minutes: 30,
      quick_recovery_lookback: 'now-11m',
      quick_recovery_lookback_minutes: 11,
      quiet_stationary_peak_min_alert_count: 30,
    });
  });

  it('scales non-critical detection settings to the 5m cadence', () => {
    expect(getRuleDetectionSchedule({ severity_score: 60 })).toEqual({
      interval_minutes: 5,
      recent_activity_minutes: 10,
      bucket_interval: '5m',
      lookback: 'now-110m',
      lookback_minutes: 110,
      quick_recovery_lookback: 'now-110m',
      quick_recovery_lookback_minutes: 110,
      quiet_stationary_peak_min_alert_count: 6,
    });
  });
});
