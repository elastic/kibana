/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
