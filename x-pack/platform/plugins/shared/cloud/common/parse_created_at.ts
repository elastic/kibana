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
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// `new Date()` rolls a day past the end of the month (`02-29` in a non-leap year) or `24:00:00` over into the
// next day instead of returning an invalid date, so those are checked here.
const isRealCalendarTime = (year: number, month: number, day: number, hour: number): boolean =>
  hour < 24 && new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day;

/**
 * Parses the `xpack.cloud.serverless.created_at` setting (an ISO-8601 timestamp with a time zone) into a `Date`.
 *
 * @param value The raw setting value.
 * @param logger Used to report a value that is set but cannot be parsed.
 * @returns The creation time, or `undefined` if the setting is missing or invalid.
 */
export function parseCreatedAt(value: string | undefined, logger: Logger): Date | undefined {
  if (!value) return undefined;

  const createdAt = new Date(value);
  const parts = ISO_TIMESTAMP_WITH_ZONE.exec(value);
  const [year, month, day, hour] = parts ? parts.slice(1).map(Number) : [];
  if (!parts || !isRealCalendarTime(year, month, day, hour) || Number.isNaN(createdAt.getTime())) {
    logger.warn(
      `cloud.serverless.created_at config value "${value}" could not be parsed as an ISO-8601 timestamp with a time zone; ignoring it.`
    );
    return undefined;
  }
  return createdAt;
}
