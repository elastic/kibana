/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeTimeRange } from './describe_time_range';

describe('describeTimeRange', () => {
  it.each([
    ['now-30d', '30 days'],
    ['now-1d', '1 day'],
    ['now-7d', '7 days'],
    ['now-15m', '15 minutes'],
    ['now-1h', '1 hour'],
    ['now-90s', '90 seconds'],
    ['now-2w', '2 weeks'],
    ['now-6M', '6 months'],
    ['now-1y', '1 year'],
  ])('describes %s as the last %s', (from, duration) => {
    expect(describeTimeRange({ from, to: 'now' })).toBe(`Last ${duration}`);
  });

  it('shows absolute ranges as dates', () => {
    expect(
      describeTimeRange({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-08T12:30:00.000Z' })
    ).toMatch(/^[A-Z][a-z]{2} \d{1,2}, 2026 .* to [A-Z][a-z]{2} \d{1,2}, 2026 .*$/);
  });

  it('shows other ranges as they were written', () => {
    expect(describeTimeRange({ from: 'now-1d/d', to: 'now-1d/d' })).toBe('now-1d/d to now-1d/d');
    expect(describeTimeRange({ from: 'now-30d', to: 'now-7d' })).toBe('now-30d to now-7d');
  });
});
