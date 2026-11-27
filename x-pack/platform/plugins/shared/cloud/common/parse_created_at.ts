/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

// `new Date()` also accepts partial or zone-less values (e.g. `2026`, or a time with no `Z`, which is read in the
// local time zone), so the format is checked first.
const ISO_TIMESTAMP_WITH_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// `new Date()` rolls a day past the end of the month (`02-29` in a non-leap year) over into the next month instead
// of returning an invalid date, so the day is checked against the month here.
const isRealCalendarDay = (year: number, month: number, day: number): boolean =>
  new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day;

/**
 * Parses the `xpack.cloud.created_at` setting (an ISO-8601 timestamp with a time zone) into a `Date`.
 *
 * @param value The raw setting value.
 * @param logger Used to report a value that is set but cannot be parsed.
 * @returns The creation time, or `undefined` if the setting is missing or invalid.
 */
export function parseCreatedAt(value: string | undefined, logger: Logger): Date | undefined {
  if (!value) return undefined;

  const parts = ISO_TIMESTAMP_WITH_ZONE.exec(value);
  const [year, month, day] = parts ? parts.slice(1).map(Number) : [];
  const createdAt = parts && isRealCalendarDay(year, month, day) ? new Date(value) : undefined;
  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    logger.warn(
      `cloud.created_at config value "${value}" could not be parsed as an ISO-8601 timestamp with a time zone; ignoring it.`
    );
    return undefined;
  }
  return createdAt;
}
