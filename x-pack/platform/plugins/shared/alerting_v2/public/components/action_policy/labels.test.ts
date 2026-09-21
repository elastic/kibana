/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFrequencyLabel, getGroupingModeLabel } from './labels';

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

describe('getFrequencyLabel', () => {
  it('returns "On status change" for per_episode + on_status_change', () => {
    expect(getFrequencyLabel({ strategy: 'on_status_change', interval: null }, 'per_episode')).toBe(
      'On status change'
    );
  });

  it('returns "On status change + repeat every N minutes" for per_episode + per_status_interval', () => {
    expect(
      getFrequencyLabel({ strategy: 'per_status_interval', interval: '5m' }, 'per_episode')
    ).toBe('On status change + repeat every 5 minutes');
  });

  it('returns "Every evaluation" for per_episode + every_time', () => {
    expect(getFrequencyLabel({ strategy: 'every_time', interval: null }, 'per_episode')).toBe(
      'Every evaluation'
    );
  });

  it('returns "At most once every N minutes" for all + time_interval', () => {
    expect(getFrequencyLabel({ strategy: 'time_interval', interval: '5m' }, 'all')).toBe(
      'At most once every 5 minutes'
    );
  });

  it('returns "At most once every N minutes" for per_field + time_interval', () => {
    expect(getFrequencyLabel({ strategy: 'time_interval', interval: '5m' }, 'per_field')).toBe(
      'At most once every 5 minutes'
    );
  });

  it('returns "Every evaluation" for all + every_time', () => {
    expect(getFrequencyLabel({ strategy: 'every_time', interval: null }, 'all')).toBe(
      'Every evaluation'
    );
  });

  it('returns the fallback for null or undefined strategy', () => {
    expect(getFrequencyLabel({ strategy: undefined, interval: null }, 'per_episode')).toBe(
      'Not configured'
    );
    expect(getFrequencyLabel(null, 'all')).toBe('Not configured');
    expect(getFrequencyLabel(undefined, 'per_episode')).toBe('Not configured');
  });

  it('returns the fallback when mode is null or undefined', () => {
    expect(getFrequencyLabel({ strategy: 'on_status_change', interval: null }, null)).toBe(
      'Not configured'
    );
    expect(getFrequencyLabel({ strategy: 'time_interval', interval: '5m' }, undefined)).toBe(
      'Not configured'
    );
  });

  it('returns the fallback when strategy does not exist for the given mode', () => {
    expect(getFrequencyLabel({ strategy: 'on_status_change', interval: null }, 'all')).toBe(
      'Not configured'
    );
  });

  it('returns the fallback when interval is required but missing', () => {
    expect(
      getFrequencyLabel({ strategy: 'per_status_interval', interval: null }, 'per_episode')
    ).toBe('Not configured');
    expect(getFrequencyLabel({ strategy: 'time_interval', interval: null }, 'all')).toBe(
      'Not configured'
    );
  });
});
