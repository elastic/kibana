/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitSizeAndUnits, toMillis } from '../../helpers/format_size_units';
import type { PreservedTimeUnit } from './time_unit_types';

export interface DoubledDurationResult {
  value: string;
  unit: PreservedTimeUnit;
  ms: number;
}

export interface GetDoubledDurationFromPreviousOptions {
  /** Defaults to 2. */
  readonly multiplier?: number;
  /** Fallback used when `previousValue` is missing/invalid. */
  readonly previousValueFallback: number;
  /** Inclusive minimum for the previous numeric value. */
  readonly previousValueMinInclusive?: number;
  /** Exclusive minimum for the previous numeric value. */
  readonly previousValueMinExclusive?: number;
}

export const toMilliseconds = (value: string, unit: PreservedTimeUnit): number => {
  if (value.trim() === '') return -1;
  const resolvedValue = value.trim();
  const ms = toMillis(`${resolvedValue}${unit}`);
  return ms === undefined ? Number.NaN : ms;
};

const toSafeNumber = (
  value: string,
  {
    fallback,
    minInclusive,
    minExclusive,
  }: { fallback: number; minInclusive?: number; minExclusive?: number }
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (minInclusive !== undefined && parsed < minInclusive) return fallback;
  if (minExclusive !== undefined && parsed <= minExclusive) return fallback;
  return parsed;
};

export const getDoubledDurationFromPrevious = ({
  previousValue,
  previousUnit,
  multiplier = 2,
  previousValueFallback,
  previousValueMinInclusive,
  previousValueMinExclusive,
}: {
  previousValue: string;
  previousUnit: PreservedTimeUnit;
} & GetDoubledDurationFromPreviousOptions): DoubledDurationResult => {
  const safePrevious = toSafeNumber(previousValue, {
    fallback: previousValueFallback,
    minInclusive: previousValueMinInclusive,
    minExclusive: previousValueMinExclusive,
  });

  const next = safePrevious * multiplier;
  const nextValue = String(next);
  const ms = toMilliseconds(nextValue, previousUnit);
  return { value: nextValue, unit: previousUnit, ms: Number.isFinite(ms) ? ms : -1 };
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
