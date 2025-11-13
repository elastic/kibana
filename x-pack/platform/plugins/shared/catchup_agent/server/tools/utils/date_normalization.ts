/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

/**
 * Normalizes a date string to include the current year if no year is specified.
 * Handles formats like:
 * - "10-31" or "10-31T00:00:00Z" -> "2025-10-31T00:00:00Z" (assuming current year is 2025)
 * - "2024-10-31T00:00:00Z" -> "2024-10-31T00:00:00Z" (unchanged if year is present)
 *
 * @param dateString - ISO datetime string that may or may not include a year
 * @returns ISO datetime string with year guaranteed to be present
 */
export function normalizeDateToCurrentYear(dateString: string): string {
  // If the string already contains a 4-digit year at the start, return as-is
  const yearMatch = dateString.match(/^(\d{4})-/);
  if (yearMatch) {
    return dateString;
  }

  // Get current year
  const currentYear = new Date().getFullYear();

  // Handle formats like "MM-DD" or "MM-DDTHH:mm:ssZ"
  // Match patterns like: "10-31", "10-31T00:00:00", "10-31T00:00:00Z"
  const monthDayMatch = dateString.match(/^(\d{1,2})-(\d{1,2})(.*)$/);
  if (monthDayMatch) {
    const [, month, day, rest] = monthDayMatch;
    // Ensure month and day are zero-padded
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');

    // If rest starts with 'T', it's a time component; otherwise it's just date
    if (rest.startsWith('T') || rest === '') {
      // Format: "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ssZ"
      const timePart = rest || 'T00:00:00Z';
      return `${currentYear}-${paddedMonth}-${paddedDay}${timePart}`;
    }
  }

  // If we can't parse it, return as-is (will likely fail validation later)
  return dateString;
}

/**
 * Options for normalizing time ranges
 */
export interface NormalizeTimeRangeOptions {
  /**
   * Logger instance for debug messages
   */
  logger?: {
    debug?: (message: string) => void;
  };
  /**
   * Threshold in milliseconds for considering an end date as "in the past"
   * Defaults to 5 minutes (300000 ms)
   */
  pastThresholdMs?: number;
  /**
   * Tolerance for detecting relative time ranges (e.g., "past 24 hours")
   * If the duration is within this tolerance of common relative ranges, it will be adjusted
   * Defaults to 1 hour (3600000 ms)
   */
  relativeRangeToleranceMs?: number;
}

/**
 * Result of normalizing a time range
 */
export interface NormalizedTimeRange {
  /**
   * Normalized start date as ISO string
   */
  start: string;
  /**
   * Normalized end date as ISO string (null if not provided)
   */
  end: string | null;
  /**
   * Start date as Date object
   */
  startDate: Date;
  /**
   * End date as Date object (null if not provided)
   */
  endDate: Date | null;
}

/**
 * Normalizes a time range to handle both relative and fixed date ranges consistently.
 *
 * For relative time ranges (e.g., "past 24 hours", "past week"):
 * - If the end date is in the past, adjusts both start and end to "now-duration to now"
 * - This ensures "past 24 hours" always means "the 24 hours ending now", not a fixed range
 *
 * For fixed date ranges (e.g., "September 2024", "2024-01-01 to 2024-01-31"):
 * - Keeps the range as-is, assuming it's intentionally fixed
 *
 * **IMPORTANT**: This function expects static ISO datetime strings. Dynamic date placeholders
 * (__DYNAMIC_*__) should be resolved at the workflow level before being passed to tools.
 *
 * @param start - ISO datetime string for the start time (inclusive). Must be a static ISO string, not a dynamic placeholder.
 * @param end - Optional ISO datetime string for the end time (exclusive). Must be a static ISO string, not a dynamic placeholder.
 * @param options - Options for normalization
 * @returns Normalized time range with start/end as ISO strings and Date objects
 */
export function normalizeTimeRange(
  start: string,
  end: string | undefined,
  options: NormalizeTimeRangeOptions = {}
): NormalizedTimeRange {
  const {
    logger,
    pastThresholdMs = 5 * 60 * 1000, // 5 minutes default
    relativeRangeToleranceMs = 60 * 60 * 1000, // 1 hour default
  } = options;

  // Normalize dates to current year if year is missing
  const normalizedStart = normalizeDateToCurrentYear(start);
  const startDate = moment(normalizedStart).toDate();
  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid datetime format: ${start}. Expected ISO 8601 format.`);
  }

  const now = moment();
  let endDate: Date | null = null;
  let normalizedEnd: string | null = null;
  let adjustedStart = normalizedStart;
  let adjustedStartDate = startDate;

  if (end) {
    normalizedEnd = normalizeDateToCurrentYear(end);
    endDate = moment(normalizedEnd).toDate();
    if (isNaN(endDate.getTime())) {
      throw new Error(`Invalid datetime format: ${end}. Expected ISO 8601 format.`);
    }

    const endMoment = moment(endDate);
    const pastThreshold = moment().subtract(pastThresholdMs, 'milliseconds');

    // If end date is in the past (beyond threshold), check if this is a relative time range
    if (endMoment.isBefore(pastThreshold)) {
      const durationMs = endMoment.valueOf() - moment(startDate).valueOf();

      // Check if this looks like a relative time range by comparing to common durations
      // We'll check for: 24 hours, 7 days, 30 days, etc.
      const commonRelativeRanges = [
        { hours: 24, name: '24 hours' },
        { days: 7, name: '7 days' },
        { days: 30, name: '30 days' },
        { days: 90, name: '90 days' },
      ];

      let matchedRange: { hours?: number; days?: number; name: string } | null = null;
      for (const range of commonRelativeRanges) {
        const rangeDurationMs = range.hours
          ? range.hours * 60 * 60 * 1000
          : range.days! * 24 * 60 * 60 * 1000;
        const diff = Math.abs(durationMs - rangeDurationMs);
        if (diff <= relativeRangeToleranceMs) {
          matchedRange = range;
          break;
        }
      }

      if (matchedRange) {
        // This is a relative time range - adjust to "now-duration to now"
        const adjustedEndMoment = now;
        const adjustedStartMoment = matchedRange.hours
          ? now.clone().subtract(matchedRange.hours, 'hours')
          : now.clone().subtract(matchedRange.days!, 'days');

        logger?.debug?.(
          `[CatchUp Agent] Detected "${matchedRange.name}" relative time range with fixed date range. ` +
            `Adjusting to now-${matchedRange.name} to now. ` +
            `Original: ${normalizedStart} to ${normalizedEnd}`
        );

        endDate = adjustedEndMoment.toDate();
        normalizedEnd = adjustedEndMoment.toISOString();
        adjustedStartDate = adjustedStartMoment.toDate();
        adjustedStart = adjustedStartMoment.toISOString();
      } else {
        // Not a recognized relative range, but end is in the past
        // Just extend end to now, preserving the original start
        logger?.debug?.(
          `[CatchUp Agent] End date ${normalizedEnd} is in the past, extending to now: ${now.toISOString()}`
        );
        endDate = now.toDate();
        normalizedEnd = now.toISOString();
      }
    }
  }

  return {
    start: adjustedStart,
    end: normalizedEnd,
    startDate: adjustedStartDate,
    endDate,
  };
}
