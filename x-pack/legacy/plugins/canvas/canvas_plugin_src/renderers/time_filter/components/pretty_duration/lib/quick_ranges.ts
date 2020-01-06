/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UnitStrings } from '../../../../../../i18n/units';

export interface QuickRange {
  /** Start date string of range */
  from: string;
  /** Start date string of range */
  to: string;
  /** Display name describing date range */
  display: string;
}

const { quickRanges: strings } = UnitStrings;

export const quickRanges: QuickRange[] = [
  { from: 'now/d', to: 'now/d', display: strings.getTodayLabel() },
  { from: 'now/w', to: 'now/w', display: strings.getThisWeekLabel() },
  { from: 'now/M', to: 'now/M', display: strings.getThisMonthLabel() },
  { from: 'now/y', to: 'now/y', display: strings.getThisYearLabel() },
  { from: 'now/d', to: 'now', display: strings.getTheDaySoFarLabel() },
  { from: 'now/w', to: 'now', display: strings.getWeekToDateLabel() },
  { from: 'now/M', to: 'now', display: strings.getMonthToDateLabel() },
  { from: 'now/y', to: 'now', display: strings.getYearToDateLabel() },

  { from: 'now-1d/d', to: 'now-1d/d', display: strings.getYesterdayLabel() },
  { from: 'now-2d/d', to: 'now-2d/d', display: strings.getDayBeforeYesterdayLabel() },
  { from: 'now-7d/d', to: 'now-7d/d', display: strings.getThisDayLastWeek() },
  { from: 'now-1w/w', to: 'now-1w/w', display: strings.getPreviousWeekLabel() },
  { from: 'now-1M/M', to: 'now-1M/M', display: strings.getPreviousMonthLabel() },
  { from: 'now-1y/y', to: 'now-1y/y', display: strings.getPreviousYearLabel() },

  { from: 'now-15m', to: 'now', display: strings.getLast15MinutesLabel() },
  { from: 'now-30m', to: 'now', display: strings.getLast30MinutesLabel() },
  { from: 'now-1h', to: 'now', display: strings.getLast1HourLabel() },
  { from: 'now-4h', to: 'now', display: strings.getLast4HoursLabel() },
  { from: 'now-12h', to: 'now', display: strings.getLast12HoursLabel() },
  { from: 'now-24h', to: 'now', display: strings.getLast24HoursLabel() },
  { from: 'now-7d', to: 'now', display: strings.getLast7DaysLabel() },
  { from: 'now-14d', to: 'now', display: strings.getLast2WeeksLabel() },

  { from: 'now-30d', to: 'now', display: strings.getLast30DaysLabel() },
  { from: 'now-60d', to: 'now', display: strings.getLast60DaysLabel() },
  { from: 'now-90d', to: 'now', display: strings.getLast90DaysLabel() },
  { from: 'now-6M', to: 'now', display: strings.getLast6MonthsLabel() },
  { from: 'now-1y', to: 'now', display: strings.getLast1YearLabel() },
  { from: 'now-2y', to: 'now', display: strings.getLast2YearsLabel() },
  { from: 'now-5y', to: 'now', display: strings.getLast5YearsLabel() },
];
