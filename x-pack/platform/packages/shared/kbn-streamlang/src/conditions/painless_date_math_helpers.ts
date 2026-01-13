/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { encodeValue } from '../../types/utils/painless_encoding';

/**
 * Helper to normalize various date formats to ISO format
 * Uses @kbn/datemath for robust date parsing
 */
function normalizeDateString(dateStr: string): string {
  const parsed = dateMath.parse(dateStr);
  if (!parsed || !parsed.isValid()) {
    // Fall back to basic normalization if datemath can't parse it
    return dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`;
  }
  return parsed.toISOString();
}

/**
 * Converts Elasticsearch date math expressions into Painless code
 *
 * Converts Elasticsearch date math expressions into Painless code that matches ES's behavior:
 * - Uses ZonedDateTime for calendar units (years, months) to handle variable-length periods correctly
 * - Uses millisecond arithmetic only when ONLY time units are involved (better performance)
 *
 * The generated Painless code returns an ISO 8601 string for string comparisons in conditions.
 */
export function evaluateDateMath(expression: string): string {
  const expr = String(expression).trim();

  // Check if it's a date math expression (contains 'now' or '||')
  if (expr.includes('now') || expr.includes('||')) {
    let code: string;
    let remainingExpr: string;

    // Parse the anchor date and any subsequent operations
    if (expr.startsWith('now')) {
      // Anchor is 'now'
      code = 'System.currentTimeMillis()';
      remainingExpr = expr.substring(3); // Remove 'now'
    } else if (expr.includes('||')) {
      // Anchor is a date string with ||
      const [dateStr, mathExpr] = expr.split('||');

      // Normalize various date formats to ISO format for Painless
      const normalizedDate = normalizeDateString(dateStr.trim());

      // Parse the date string to get milliseconds
      code = `Instant.parse(${encodeValue(normalizedDate)}).toEpochMilli()`;
      remainingExpr = mathExpr || '';
    } else {
      // Not a valid date math expression
      const encoded = encodeValue(String(expression));
      return typeof encoded === 'string' ? encoded : String(encoded);
    }

    // Parse all offset and rounding operations first to determine if we need calendar-aware operations
    const offsetRegex = /([+-])(\d+)([yMwdhHms])/g;
    let match;
    let useZonedDateTime = false;
    const offsets: Array<{ sign: string; amount: number; unit: string }> = [];

    while ((match = offsetRegex.exec(remainingExpr)) !== null) {
      const sign = match[1];
      const amount = parseInt(match[2], 10);
      const unit = match[3];
      offsets.push({ sign, amount, unit });

      // Use ZonedDateTime for calendar units (years, months) to match ES behavior
      if (unit === 'y' || unit === 'M') {
        useZonedDateTime = true;
      }
    }

    // Parse rounding operation (e.g., /d)
    const roundMatch = remainingExpr.match(/\/([yMwdhHms])/);
    const roundUnit = roundMatch ? roundMatch[1] : null;

    // Apply offsets and rounding
    if (offsets.length > 0 || roundUnit) {
      if (useZonedDateTime) {
        // Convert to ZonedDateTime for calendar-aware operations
        code = `ZonedDateTime.ofInstant(Instant.ofEpochMilli(${code}), ZoneId.of('Z'))`;

        for (const { sign, amount, unit } of offsets) {
          const method = sign === '+' ? 'plus' : 'minus';
          switch (unit) {
            case 'y':
              code = `${code}.${method}Years(${amount}L)`;
              break;
            case 'M':
              code = `${code}.${method}Months(${amount}L)`;
              break;
            case 'w':
              code = `${code}.${method}Weeks(${amount}L)`;
              break;
            case 'd':
              code = `${code}.${method}Days(${amount}L)`;
              break;
            case 'h':
            case 'H':
              code = `${code}.${method}Hours(${amount}L)`;
              break;
            case 'm':
              code = `${code}.${method}Minutes(${amount}L)`;
              break;
            case 's':
              code = `${code}.${method}Seconds(${amount}L)`;
              break;
          }
        }

        if (roundUnit) {
          switch (roundUnit) {
            case 'y':
              code = `${code}.withDayOfYear(1).withHour(0).withMinute(0).withSecond(0).withNano(0)`;
              break;
            case 'M':
              code = `${code}.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0)`;
              break;
            case 'w':
              code = `${code}.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).withHour(0).withMinute(0).withSecond(0).withNano(0)`;
              break;
            case 'd':
              code = `${code}.withHour(0).withMinute(0).withSecond(0).withNano(0)`;
              break;
            case 'h':
            case 'H':
              code = `${code}.withMinute(0).withSecond(0).withNano(0)`;
              break;
            case 'm':
              code = `${code}.withSecond(0).withNano(0)`;
              break;
            case 's':
              code = `${code}.withNano(0)`;
              break;
          }
        }

        // Convert back to epoch millis at the very end
        code = `${code}.toInstant().toEpochMilli()`;
      } else {
        // For time units only (no calendar units), use simple millisecond arithmetic for performance
        const msPerUnit: Record<string, number> = {
          w: 7 * 24 * 60 * 60 * 1000,
          d: 24 * 60 * 60 * 1000,
          h: 60 * 60 * 1000,
          H: 60 * 60 * 1000,
          m: 60 * 1000,
          s: 1000,
        };

        // Apply all offsets
        for (const { sign, amount, unit } of offsets) {
          const ms = msPerUnit[unit];
          if (ms) {
            const offsetMs = amount * ms;
            code = sign === '+' ? `(${code} + ${offsetMs}L)` : `(${code} - ${offsetMs}L)`;
          }
        }

        // Apply rounding
        if (roundUnit) {
          const roundMs = msPerUnit[roundUnit];
          if (roundMs) {
            // Round down to the nearest unit
            code = `((long)(${code} / ${roundMs}L) * ${roundMs}L)`;
          }
        }
      }
    }

    // Convert milliseconds to ISO date string for comparison
    return `(Instant.ofEpochMilli(${code}).toString())`;
  }

  // Not a date math expression, return as-is (already quoted by encodeValue)
  const encoded = encodeValue(String(expression));
  return typeof encoded === 'string' ? encoded : String(encoded);
}
