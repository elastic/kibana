/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupingModeLabel, getThrottleStrategyLabel } from './labels';

describe('getGroupingModeLabel', () => {
  it('returns the Episode label for per_episode', () => {
    expect(getGroupingModeLabel('per_episode')).toBe('Episode');
  });

  it('returns the Group label for per_field', () => {
    expect(getGroupingModeLabel('per_field')).toBe('Group');
  });

  it('returns the Digest label for all', () => {
    expect(getGroupingModeLabel('all')).toBe('Digest');
  });

  it('returns the fallback for null or undefined', () => {
    expect(getGroupingModeLabel(null)).toBe('Not configured');
    expect(getGroupingModeLabel(undefined)).toBe('Not configured');
  });
});

describe('getThrottleStrategyLabel', () => {
  it('returns the per-episode label for on_status_change when mode is per_episode', () => {
    expect(getThrottleStrategyLabel('on_status_change', 'per_episode')).toBe('On status change');
  });

  it('returns the per-episode label for per_status_interval when mode is per_episode', () => {
    expect(getThrottleStrategyLabel('per_status_interval', 'per_episode')).toBe(
      'On status change + repeat at interval'
    );
  });

  it('returns the aggregate label for time_interval when mode is all', () => {
    expect(getThrottleStrategyLabel('time_interval', 'all')).toBe('At most once every...');
  });

  it('returns the aggregate label for time_interval when mode is per_field', () => {
    expect(getThrottleStrategyLabel('time_interval', 'per_field')).toBe('At most once every...');
  });

  it('returns the per-episode every-time label when mode is per_episode', () => {
    expect(getThrottleStrategyLabel('every_time', 'per_episode')).toBe('Every evaluation');
  });

  it('returns the aggregate every-time label when mode is all', () => {
    expect(getThrottleStrategyLabel('every_time', 'all')).toBe('Every evaluation');
  });

  it('returns the fallback for null or undefined strategy', () => {
    expect(getThrottleStrategyLabel(null, 'per_episode')).toBe('Not configured');
    expect(getThrottleStrategyLabel(undefined, 'all')).toBe('Not configured');
  });

  it('returns the fallback when mode is null or undefined', () => {
    expect(getThrottleStrategyLabel('on_status_change', null)).toBe('Not configured');
    expect(getThrottleStrategyLabel('time_interval', undefined)).toBe('Not configured');
  });

  it('returns the fallback when strategy does not exist for the given mode', () => {
    expect(getThrottleStrategyLabel('on_status_change', 'all')).toBe('Not configured');
  });
});
