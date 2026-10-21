/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticBag } from './diagnostics';
import type { ResolvedTimeWindow } from './query_types';

const ES_QL_DURATION_UNITS: Record<string, string> = {
  s: 'second',
  m: 'minute',
  h: 'hour',
  d: 'day',
  w: 'week',
  M: 'month',
  y: 'year',
};

const UNIT_TO_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  M: 2_592_000_000,
  y: 31_536_000_000,
};

export const parseShiftToEsqlInterval = (shift: string): string | undefined => {
  const match = /^(\d+(?:\.\d+)?)\s*([smhdwMy])$/.exec(shift.trim());
  if (!match) {
    return undefined;
  }
  const [, amount, unit] = match;
  const fullUnit = ES_QL_DURATION_UNITS[unit!];
  return fullUnit ? `${amount} ${fullUnit}` : undefined;
};

const kibanaTimeToEsql = (value: string): string | undefined => {
  const trimmed = value.trim();
  const datemath =
    /^now(?:\s*([+-])\s*(\d+(?:\.\d+)?)\s*([smhdwMy]))?(?:\s*\/\s*([smhdwMy]))?$/.exec(trimmed);
  if (datemath) {
    const [, sign, amount, offsetUnit, roundUnit] = datemath;
    let expr = 'NOW()';
    if (sign && amount && offsetUnit) {
      const fullUnit = ES_QL_DURATION_UNITS[offsetUnit];
      if (!fullUnit) {
        return undefined;
      }
      expr = `NOW() ${sign} ${amount} ${fullUnit}`;
    }
    if (roundUnit) {
      const roundFull = ES_QL_DURATION_UNITS[roundUnit];
      if (!roundFull) {
        return undefined;
      }
      expr = `DATE_TRUNC(1 ${roundFull}, ${expr})`;
    }
    return expr;
  }
  if (/^\d{4}-\d{2}-\d{2}(?:T[\d:.+\-Z]+)?$/.test(trimmed)) {
    return `"${trimmed}"::DATETIME`;
  }
  return undefined;
};

const relativeDurationToEsql = (value: string): string | undefined => {
  const match = /^now-(\d+(?:\.\d+)?)\s*([smhdwMy])(?:\s*\/\s*[smhdwMy])?$/.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const fullUnit = ES_QL_DURATION_UNITS[match[2]!];
  return fullUnit ? `${match[1]} ${fullUnit}` : undefined;
};

const roundInstantMs = (value: number, unit: string): number | undefined => {
  const date = new Date(value);
  switch (unit) {
    case 's':
      date.setUTCMilliseconds(0);
      return date.getTime();
    case 'm':
      date.setUTCSeconds(0, 0);
      return date.getTime();
    case 'h':
      date.setUTCMinutes(0, 0, 0);
      return date.getTime();
    case 'd':
      date.setUTCHours(0, 0, 0, 0);
      return date.getTime();
    case 'w': {
      date.setUTCHours(0, 0, 0, 0);
      const day = date.getUTCDay();
      const daysSinceMonday = day === 0 ? 6 : day - 1;
      date.setUTCDate(date.getUTCDate() - daysSinceMonday);
      return date.getTime();
    }
    case 'M':
      date.setUTCDate(1);
      date.setUTCHours(0, 0, 0, 0);
      return date.getTime();
    case 'y':
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
      return date.getTime();
    default:
      return undefined;
  }
};

export const resolveInstantMs = (value: string, nowMs: number): number | undefined => {
  const trimmed = value.trim();
  const datemath =
    /^now(?:\s*([+-])\s*(\d+(?:\.\d+)?)\s*([smhdwMy]))?(?:\s*\/\s*([smhdwMy]))?$/.exec(trimmed);
  if (datemath) {
    const [, sign, amount, offsetUnit, roundUnit] = datemath;
    let resolved = nowMs;
    if (sign && amount && offsetUnit) {
      const unitMs = UNIT_TO_MS[offsetUnit];
      if (!unitMs) {
        return undefined;
      }
      const offsetMs = Number(amount) * unitMs;
      resolved = sign === '-' ? resolved - offsetMs : resolved + offsetMs;
    }
    return roundUnit ? roundInstantMs(resolved, roundUnit) : resolved;
  }
  const absolute = Date.parse(trimmed);
  return Number.isNaN(absolute) ? undefined : absolute;
};

export const timeRangeDurationMs = (
  range: { from: string; to: string } | undefined
): number | undefined => {
  if (!range) {
    return undefined;
  }
  const now = Date.now();
  const from = resolveInstantMs(range.from, now);
  const to = resolveInstantMs(range.to, now);
  if (from === undefined || to === undefined) {
    return undefined;
  }
  const duration = to - from;
  return duration > 0 ? duration : undefined;
};

export const resolveTimeWindow = (
  range: { from: string; to: string } | undefined,
  diagnostics: DiagnosticBag
): ResolvedTimeWindow | undefined => {
  if (!range) {
    return undefined;
  }
  const fromEsql = kibanaTimeToEsql(range.from);
  const toEsql = kibanaTimeToEsql(range.to);
  if (!fromEsql || !toEsql) {
    diagnostics.push({
      level: 'warn',
      code: 'lens.formBased.time-range-unrecognized',
      message: `time range "${range.from}/${range.to}" could not be parsed; queries will run unfiltered`,
    });
    return undefined;
  }
  const durationEsql = relativeDurationToEsql(range.from);
  return {
    fromEsql,
    toEsql,
    ...(durationEsql ? { durationEsql } : {}),
  };
};
