/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitSizeAndUnits, toMillis } from '../../helpers/format_size_units';
import type { PreservedTimeUnit } from './time_unit_types';

export const toMilliseconds = (value: string, unit: PreservedTimeUnit): number => {
  if (value.trim() === '') return -1;
  const resolvedValue = value.trim();
  const ms = toMillis(`${resolvedValue}${unit}`);
  return ms === undefined ? Number.NaN : ms;
};

export const parseInterval = (
  duration: string | undefined
): { value: string; unit: PreservedTimeUnit } | undefined => {
  if (!duration) return;

  // Preserve the original unit (e.g. `ms`, `micros`, `nanos`).
  // Flyouts only *offer* d/h/m/s by default, but can display and round-trip other known units.
  const { size, unit } = splitSizeAndUnits(duration);
  if (!size || !unit) return;
  if (toMillis(`1${unit}`) === undefined) return;
  return { value: size, unit: unit as PreservedTimeUnit };
};

export const formatMillisecondsInUnit = (
  ms: number,
  unit: PreservedTimeUnit,
  precision = 2
): string => {
  const multiplier = toMillis(`1${unit}`);
  if (multiplier === undefined || multiplier === 0) {
    return `${ms}ms`;
  }

  const valueInUnit = ms / multiplier;
  const formatted =
    Number.isFinite(valueInUnit) && Number.isInteger(valueInUnit)
      ? String(valueInUnit)
      : String(Number(valueInUnit.toFixed(precision)));
  return `${formatted}${unit}`;
};
