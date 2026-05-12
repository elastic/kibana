/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlStringLiteral, withWhereClause } from './common';

/**
 * Elasticsearch built-in named date formats → Go reference time layout strings.
 *
 * Go's reference time: Mon Jan 2 15:04:05 MST 2006 (= 01/02 03:04:05PM '06 -0700)
 */
const NAMED_FORMAT_MAP: Record<string, string | 'epoch_millis' | 'epoch_second'> = {
  strict_date_optional_time: "2006-01-02T15:04:05.999999999Z07:00",
  date_optional_time: "2006-01-02T15:04:05.999Z07:00",
  strict_date_time: "2006-01-02T15:04:05.999Z07:00",
  date_time: "2006-01-02T15:04:05.999Z07:00",
  strict_date_time_no_millis: "2006-01-02T15:04:05Z07:00",
  date_time_no_millis: "2006-01-02T15:04:05Z07:00",
  strict_date: "2006-01-02",
  date: "2006-01-02",
  basic_date: "20060102",
  basic_date_time: "20060102T150405.000Z07:00",
  basic_date_time_no_millis: "20060102T150405Z07:00",
  strict_hour_minute_second: "15:04:05",
  hour_minute_second: "15:04:05",
  strict_hour_minute_second_millis: "15:04:05.000",
  hour_minute_second_millis: "15:04:05.000",
  strict_hour_minute_second_fraction: "15:04:05.000",
  hour_minute_second_fraction: "15:04:05.000",
  strict_year_month_day: "2006-01-02",
  year_month_day: "2006-01-02",
  strict_year_month: "2006-01",
  year_month: "2006-01",
  strict_year: "2006",
  year: "2006",
  epoch_millis: "epoch_millis",
  epoch_second: "epoch_second",
};

/**
 * Ordered list of Java date format tokens → Go layout strings. Longer tokens
 * are listed first so the scanner always matches the longest possible token.
 */
const TOKEN_MAP: Array<{ pattern: RegExp; go: string }> = [
  // Fractional seconds — longest first
  { pattern: /^SSSSSSSSS/, go: '000000000' },
  { pattern: /^SSSSSS/, go: '000000' },
  { pattern: /^SSS/, go: '000' },
  { pattern: /^SS/, go: '00' },
  { pattern: /^S/, go: '0' },
  // Year
  { pattern: /^yyyy/, go: '2006' },
  { pattern: /^yy/, go: '06' },
  // Month (longest first)
  { pattern: /^MMMM/, go: 'January' },
  { pattern: /^MMM/, go: 'Jan' },
  { pattern: /^MM/, go: '01' },
  { pattern: /^M(?![a-z])/, go: '1' },
  // Day name (longest first)
  { pattern: /^EEEE/, go: 'Monday' },
  { pattern: /^EEE/, go: 'Mon' },
  // Day
  { pattern: /^dd/, go: '02' },
  { pattern: /^d/, go: '2' },
  // AM/PM
  { pattern: /^a/, go: 'PM' },
  // 24h hour
  { pattern: /^HH/, go: '15' },
  { pattern: /^H/, go: '15' },
  // 12h hour (padded)
  { pattern: /^hh/, go: '03' },
  { pattern: /^h/, go: '3' },
  // Minute
  { pattern: /^mm/, go: '04' },
  { pattern: /^m/, go: '4' },
  // Second
  { pattern: /^ss/, go: '05' },
  { pattern: /^s(?![s])/, go: '5' },
  // ISO 8601 timezone offset (longest first)
  { pattern: /^XXXXX/, go: 'Z07:00:00' },
  { pattern: /^XXXX/, go: 'Z0700' },
  { pattern: /^XXX/, go: 'Z07:00' },
  { pattern: /^XX/, go: 'Z0700' },
  { pattern: /^X/, go: 'Z07' },
  // RFC 822 / other timezone forms (longest first)
  { pattern: /^ZZZZZ/, go: 'Z07:00:00' },
  { pattern: /^ZZZZ/, go: '-07:00' },
  { pattern: /^ZZZ/, go: 'MST' },
  { pattern: /^ZZ/, go: '-07:00' },
  { pattern: /^Z/, go: '-0700' },
  // Timezone name
  { pattern: /^z/, go: 'MST' },
];

/**
 * Translate a Java/Elasticsearch date format pattern to a Go reference time layout.
 *
 * Rules:
 * - Single-quoted literals (`'T'`) are unquoted and passed through.
 * - Known format tokens are replaced using TOKEN_MAP (longest-match, left-to-right).
 * - Unknown characters are passed through verbatim (e.g., `-`, `:`, `.`, `T`).
 */
const translateJavaDateFormat = (javaFmt: string): string => {
  let result = '';
  let i = 0;
  while (i < javaFmt.length) {
    if (javaFmt[i] === "'") {
      // Quoted literal — consume until closing quote, pass through contents.
      i++;
      while (i < javaFmt.length && javaFmt[i] !== "'") {
        result += javaFmt[i++];
      }
      if (i < javaFmt.length) i++; // skip closing quote
    } else {
      const remaining = javaFmt.slice(i);
      let matched = false;
      for (const { pattern, go } of TOKEN_MAP) {
        const m = remaining.match(pattern);
        if (m) {
          result += go;
          i += m[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result += javaFmt[i++];
      }
    }
  }
  return result;
};

/**
 * Resolve an Elasticsearch/Java format string to either a Go layout or a special
 * mode string ('epoch_millis' | 'epoch_second').
 */
const resolveFormat = (fmt: string): string => {
  const named = NAMED_FORMAT_MAP[fmt];
  if (named) return named;
  return translateJavaDateFormat(fmt);
};

/**
 * Transpile a Streamlang `date` processor to OTTL statements.
 *
 * Each format in `formats` is attempted in order. Under `error_mode: ignore` or
 * `silent`, a `Time()` call that fails for a wrong format is silently skipped and
 * the next format is tried (via a `target == nil` guard). Under `error_mode: propagate`,
 * multi-format inputs are unsafe — only single-format date processors are reliable
 * with propagate. A warning is emitted when more than one format is provided.
 *
 * Special formats:
 * - `epoch_millis` / `epoch_second`: the source field is treated as a number and
 *   multiplied to nanoseconds — no `Time()` call is needed.
 *
 * `output_format`: OTTL has no time-to-string function. A warning is emitted and
 * the output is stored as unix nanoseconds regardless of `output_format`.
 *
 * `locale`: Go's time package always uses English names for months/days. A warning
 * is emitted if a non-English locale is requested.
 *
 * `timezone`: passed as the third argument to `Time()`. Must be a valid IANA
 * timezone name (e.g., `"America/New_York"`).
 */
export const convertDateProcessorToOtel = (
  processor: DateProcessor
): { emission: Emission; warnings: string[] } => {
  const { from, to, formats, output_format, timezone, locale, where } = processor;
  const fromAttr = attributePath(from);
  const targetAttr = attributePath(to ?? from);

  const warnings: string[] = [];

  if (output_format) {
    warnings.push(
      `date on field "${from}": output_format "${output_format}" is not implementable in OTTL — ` +
        `the parsed date is stored as unix nanoseconds (int64) instead.`
    );
  }

  if (locale && locale !== 'en' && locale !== 'en-US' && locale !== 'en_US') {
    warnings.push(
      `date on field "${from}": locale "${locale}" is ignored — Go's time package always ` +
        `uses English month/day names.`
    );
  }

  if (formats.length > 1) {
    warnings.push(
      `date on field "${from}" has ${formats.length} formats. Under error_mode: propagate, ` +
        `only the first matching format is tried safely — subsequent formats require ` +
        `error_mode: ignore or silent to attempt.`
    );
  }

  const resolvedFormats = formats.map(resolveFormat);

  const baseWhereParts: string[] = [];
  if (where) baseWhereParts.push(conditionToOttl(where));
  baseWhereParts.push(`${fromAttr} != nil`);

  const statements: string[] = [];

  for (const resolved of resolvedFormats) {
    const targetNilGuard = `${targetAttr} == nil`;
    const whereParts = [...baseWhereParts, targetNilGuard];
    const whereExpr = whereParts.map((p) => `(${p})`).join(' and ');

    if (resolved === 'epoch_millis') {
      // epoch_millis: multiply milliseconds by 1,000,000 to get nanoseconds
      statements.push(withWhereClause(`set(${targetAttr}, Int(${fromAttr}) * 1000000)`, whereExpr));
    } else if (resolved === 'epoch_second') {
      // epoch_second: multiply seconds by 1,000,000,000 to get nanoseconds
      statements.push(
        withWhereClause(`set(${targetAttr}, Int(${fromAttr}) * 1000000000)`, whereExpr)
      );
    } else {
      const tzArg = timezone ? `, ${ottlStringLiteral(timezone)}` : '';
      statements.push(
        withWhereClause(
          `set(${targetAttr}, UnixNano(Time(${fromAttr}, ${ottlStringLiteral(resolved)}${tzArg})))`,
          whereExpr
        )
      );
    }
  }

  return { emission: { kind: 'transform', statements }, warnings };
};
