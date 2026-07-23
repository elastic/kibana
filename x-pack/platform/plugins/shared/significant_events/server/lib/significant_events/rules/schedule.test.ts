/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CRITICAL_RULE_INTERVAL,
  DEFAULT_RULE_INTERVAL,
  getMetricSeriesRuleSchedule,
  getRuleDetectionSchedule,
  scheduleIntervalForQuery,
} from './schedule';
import {
  METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
  METRIC_SERIES_EVERY,
  METRIC_SERIES_LOOKBACK,
} from './metric_series_contract';

describe('Significant Events rule scheduling', () => {
  it.each([
    [85, CRITICAL_RULE_INTERVAL],
    [80, CRITICAL_RULE_INTERVAL],
    [60, DEFAULT_RULE_INTERVAL],
    [undefined, DEFAULT_RULE_INTERVAL],
  ])('maps severity %s to analysis profile key %s', (severityScore, expectedInterval) => {
    expect(scheduleIntervalForQuery({ severity_score: severityScore })).toBe(expectedInterval);
  });

  it('uses one metric-series execution schedule for all MATCH rules', () => {
    expect(getMetricSeriesRuleSchedule()).toEqual({
      every: METRIC_SERIES_EVERY,
      lookback: METRIC_SERIES_LOOKBACK,
    });
    expect(METRIC_SERIES_EVERY).toBe('5m');
    expect(METRIC_SERIES_LOOKBACK).toBe('6m');
  });

  it('uses critical analysis profile with 1m buckets', () => {
    expect(getRuleDetectionSchedule({ severity_score: 80 })).toEqual({
      interval_minutes: 1,
      bucket_interval: METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
      lookback: 'now-40m',
      lookback_minutes: 40,
    });
  });

  it('uses default analysis profile on 1m buckets with a longer lookback', () => {
    expect(getRuleDetectionSchedule({ severity_score: 60 })).toEqual({
      interval_minutes: 5,
      bucket_interval: METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
      lookback: 'now-125m',
      lookback_minutes: 125,
    });
  });
});
