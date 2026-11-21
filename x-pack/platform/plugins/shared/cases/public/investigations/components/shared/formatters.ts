/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import * as i18n from './translations';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

/** A short relative time such as "Just now", "11 min ago", "6 h ago" or "2 days ago". */
export const formatRelativeTime = (iso: string, now: number = Date.now()): string => {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return iso;
  }
  const elapsed = Math.max(0, now - timestamp);

  if (elapsed < 10 * SECOND_MS) return i18n.JUST_NOW;
  if (elapsed < MINUTE_MS) return i18n.SECONDS_AGO(Math.floor(elapsed / SECOND_MS));
  if (elapsed < HOUR_MS) return i18n.MINUTES_AGO(Math.floor(elapsed / MINUTE_MS));
  if (elapsed < DAY_MS) return i18n.HOURS_AGO(Math.floor(elapsed / HOUR_MS));
  if (elapsed < WEEK_MS) return i18n.DAYS_AGO(Math.floor(elapsed / DAY_MS));
  if (elapsed < MONTH_MS) return i18n.WEEKS_AGO(Math.floor(elapsed / WEEK_MS));
  if (elapsed < YEAR_MS) return i18n.MONTHS_AGO(Math.floor(elapsed / MONTH_MS));
  return i18n.YEARS_AGO(Math.floor(elapsed / YEAR_MS));
};

/** An absolute UTC time such as "Nov 10, 2026 @ 14:12:03 UTC". */
export const formatAbsoluteUtc = (iso: string): string => {
  const parsed = moment.utc(iso);
  return parsed.isValid() ? parsed.format('MMM D, YYYY @ HH:mm:ss [UTC]') : iso;
};

/** A compact duration such as "45 s", "5 h 12 min" or "2 days 3 h". */
export const formatDuration = (milliseconds: number): string => {
  const elapsed = Math.max(0, milliseconds);
  if (elapsed < MINUTE_MS) return i18n.SECONDS_SHORT(Math.floor(elapsed / SECOND_MS));
  if (elapsed < HOUR_MS) return i18n.MINUTES_SHORT(Math.floor(elapsed / MINUTE_MS));
  if (elapsed < DAY_MS) {
    const hours = Math.floor(elapsed / HOUR_MS);
    const minutes = Math.floor((elapsed % HOUR_MS) / MINUTE_MS);
    return minutes > 0
      ? `${i18n.HOURS_SHORT(hours)} ${i18n.MINUTES_SHORT(minutes)}`
      : i18n.HOURS_SHORT(hours);
  }
  const days = Math.floor(elapsed / DAY_MS);
  const hours = Math.floor((elapsed % DAY_MS) / HOUR_MS);
  return days < 7 && hours > 0
    ? `${i18n.DAYS_SHORT(days)} ${i18n.HOURS_SHORT(hours)}`
    : i18n.DAYS_SHORT(days);
};

/** The age shown in the header: "6 h", "21 days", or "Open for 5 h 12 min" once closed. */
export const formatAge = (
  createdAt: string,
  closedAt?: string | null,
  now: number = Date.now()
): string => {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) {
    return createdAt;
  }
  if (closedAt) {
    const closed = Date.parse(closedAt);
    if (!Number.isNaN(closed)) {
      return i18n.OPEN_FOR(formatDuration(closed - created));
    }
  }
  const elapsed = Math.max(0, now - created);
  if (elapsed < HOUR_MS) return i18n.MINUTES_SHORT(Math.floor(elapsed / MINUTE_MS));
  if (elapsed < DAY_MS) return i18n.HOURS_SHORT(Math.floor(elapsed / HOUR_MS));
  return i18n.DAYS_SHORT(Math.floor(elapsed / DAY_MS));
};
