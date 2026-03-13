/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Frequency } from '@kbn/rrule';

/**
 * Interval-based schedule. Use this or RruleSchedule, never both.
 */
export interface IntervalSchedule {
  /**
   * An interval string (e.g. '5m', '30s'). If specified, this is a recurring schedule.
   */
  interval: string;
  rrule?: never;
}

/**
 * RRule-based schedule. Use this or IntervalSchedule, never both.
 */
export interface RruleSchedule {
  rrule: Rrule;
  interval?: never;
}

/** Schedule is either interval-based or rrule-based, never both, never neither. */
export type Schedule = IntervalSchedule | RruleSchedule;

export type Rrule = RruleMonthly | RruleWeekly | RruleDaily | RruleHourly;

export interface RruleCommon {
  dtstart?: string;
  freq: Frequency;
  interval: number;
  tzid: string;
}

export interface RruleMonthly extends RruleCommon {
  freq: Frequency.MONTHLY;
  bymonthday?: number[];
  byhour?: number[];
  byminute?: number[];
  byweekday?: string[];
}

export interface RruleWeekly extends RruleCommon {
  freq: Frequency.WEEKLY;
  byweekday?: string[];
  byhour?: number[];
  byminute?: number[];
  bymonthday?: never;
}

export interface RruleDaily extends RruleCommon {
  freq: Frequency.DAILY;
  byhour?: number[];
  byminute?: number[];
  byweekday?: string[];
  bymonthday?: never;
}

export interface RruleHourly extends RruleCommon {
  freq: Frequency.HOURLY;
  byhour?: never;
  byminute?: number[];
  byweekday?: never;
  bymonthday?: never;
}
