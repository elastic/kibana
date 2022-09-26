/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

const TIME_STR_RE = /^((?:\d+)(?:\.\d+)?)(m|s)$/i;

/**
 * Either a number of milliseconds or a simple time string (eg. 2m or 30s)
 */
export type TimeOrMilliseconds = number | string;

export function toMs(timeOrMs: TimeOrMilliseconds) {
  return typeof timeOrMs === 'number' ? timeOrMs : ms(timeOrMs);
}

/**
 * Convert a basic time string into milliseconds. The string can end with
 * `m` (for minutes) or `s` (for seconds) and have any number before it.
 */
export function ms(time: string) {
  const match = time.match(TIME_STR_RE);
  if (!match) {
    throw new Error('invalid time string, expected a number followed by "m" or "s"');
  }

  const [, num, unit] = match;
  switch (unit.toLowerCase()) {
    case 's':
      return Number.parseFloat(num) * SECOND;
    case 'm':
      return Number.parseFloat(num) * MINUTE;
    default:
      throw new Error(`unexpected timestring unit [time=${time}] [unit=${unit}]`);
  }
}
