/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface QuickRange {
  /** Start date string of range */
  from: string;
  /** Start date string of range */
  to: string;
  /** Display name describing date range */
  display: string;
}

export const quickRanges: QuickRange[] = [
  { from: 'now/d', to: 'now/d', display: 'Today' },
  { from: 'now/w', to: 'now/w', display: 'This week' },
  { from: 'now/M', to: 'now/M', display: 'This month' },
  { from: 'now/y', to: 'now/y', display: 'This year' },
  { from: 'now/d', to: 'now', display: 'The day so far' },
  { from: 'now/w', to: 'now', display: 'Week to date' },
  { from: 'now/M', to: 'now', display: 'Month to date' },
  { from: 'now/y', to: 'now', display: 'Year to date' },

  { from: 'now-1d/d', to: 'now-1d/d', display: 'Yesterday' },
  { from: 'now-2d/d', to: 'now-2d/d', display: 'Day before yesterday' },
  { from: 'now-7d/d', to: 'now-7d/d', display: 'This day last week' },
  { from: 'now-1w/w', to: 'now-1w/w', display: 'Previous week' },
  { from: 'now-1M/M', to: 'now-1M/M', display: 'Previous month' },
  { from: 'now-1y/y', to: 'now-1y/y', display: 'Previous year' },

  { from: 'now-15m', to: 'now', display: 'Last 15 minutes' },
  { from: 'now-30m', to: 'now', display: 'Last 30 minutes' },
  { from: 'now-1h', to: 'now', display: 'Last 1 hour' },
  { from: 'now-4h', to: 'now', display: 'Last 4 hours' },
  { from: 'now-12h', to: 'now', display: 'Last 12 hours' },
  { from: 'now-24h', to: 'now', display: 'Last 24 hours' },
  { from: 'now-7d', to: 'now', display: 'Last 7 days' },

  { from: 'now-30d', to: 'now', display: 'Last 30 days' },
  { from: 'now-60d', to: 'now', display: 'Last 60 days' },
  { from: 'now-90d', to: 'now', display: 'Last 90 days' },
  { from: 'now-6M', to: 'now', display: 'Last 6 months' },
  { from: 'now-1y', to: 'now', display: 'Last 1 year' },
  { from: 'now-2y', to: 'now', display: 'Last 2 years' },
  { from: 'now-5y', to: 'now', display: 'Last 5 years' },
];
