/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeUnit } from './types';

const TIME_UNIT_TO_MILLISECONDS: Record<TimeUnit, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export const toMilliseconds = (value: string, unit: TimeUnit): number => {
  if (value.trim() === '') return -1;
  const num = Number(value);
  if (!Number.isFinite(num)) return Number.NaN;
  return num * TIME_UNIT_TO_MILLISECONDS[unit];
};

export const parseInterval = (
  duration: string | undefined
): { value: string; unit: TimeUnit } | undefined => {
  if (!duration) return;

  // Data stream lifecycle `after` values can be represented in milliseconds (e.g. "0ms").
  // The DSL steps flyout only supports d/h/m/s UI units, so normalize whole-second ms values to seconds.
  const msMatch = /^(\d+)ms$/.exec(duration);
  if (msMatch) {
    const ms = Number(msMatch[1]);
    if (!Number.isFinite(ms) || ms < 0) return;
    if (ms % 1000 !== 0) return;
    return { value: String(ms / 1000), unit: 's' };
  }

  // Match only integer durations for supported UI units.
  const result = /^(\d+)([dhms])$/.exec(duration);
  if (!result) return;
  return { value: result[1], unit: result[2] as TimeUnit };
};

export const formatMillisecondsInUnit = (ms: number, unit: TimeUnit, precision = 2): string => {
  const valueInUnit = ms / TIME_UNIT_TO_MILLISECONDS[unit];
  const formatted =
    Number.isFinite(valueInUnit) && Number.isInteger(valueInUnit)
      ? String(valueInUnit)
      : String(Number(valueInUnit.toFixed(precision)));
  return `${formatted}${unit}`;
};

/**
 * Extract the index from an ArrayItem path like `_meta.downsampleSteps[3]`.
 * Returns -1 if not a recognized step path.
 */
export const getStepIndexFromArrayItemPath = (path: string): number => {
  const match = /^_meta\.downsampleSteps\[(\d+)\]$/.exec(path);
  return match ? Number(match[1]) : -1;
};
