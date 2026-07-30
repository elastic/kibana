/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitSizeAndUnits, toMillis } from '../../../../../../util/format_size_units';
import type { PreservedTimeUnit } from './time_unit_types';

/**
 * Compute the `step` for an `EuiFieldNumber` whose value must be a multiple of
 * `multipleOfMs` (e.g. a downsample interval that must be a multiple of the previous
 * phase/step interval), expressed in the field's currently selected `unit`.
 *
 * Returns `1` (the default increment) when there is no multiple constraint or the
 * multiple cannot be represented as a positive finite number in the current unit.
 */
export const stepFromMultipleMs = (multipleOfMs: number, unit: PreservedTimeUnit): number => {
  if (!Number.isFinite(multipleOfMs) || multipleOfMs <= 0) return 1;
  const unitMs = toMillis(`1${unit}`);
  if (unitMs === undefined || unitMs === 0) return 1;
  const step = multipleOfMs / unitMs;
  return Number.isFinite(step) && step > 0 ? step : 1;
};

/**
 * Compute the `min` and `step` attributes for an `EuiFieldNumber` whose value must be a
 * multiple of `multipleOfMs` (e.g. a downsample interval that must be a multiple of the
 * previous phase/step interval).
 *
 * A native `<input type="number">` snaps its increment/decrement to `min + n * step`, so to
 * land the buttons on valid multiples the `min` (the step base) is anchored to the multiple
 * itself — but only while the current value is already a valid multiple. When the value is
 * off-grid (an invalid, in-progress edit) we fall back to `{ baseMin, step: 1 }` so the user
 * can nudge it back by one rather than having it snap to an unexpected grid point.
 */
export const getMultipleStepAttributes = ({
  currentValue,
  unit,
  multipleOfMs,
  baseMin,
}: {
  currentValue: string;
  unit: PreservedTimeUnit;
  multipleOfMs: number;
  baseMin: number;
}): { min: number; step: number } => {
  if (!Number.isFinite(multipleOfMs) || multipleOfMs <= 0) {
    return { min: baseMin, step: 1 };
  }

  const currentMs = toMilliseconds(currentValue, unit);
  const isAlignedToMultiple =
    Number.isFinite(currentMs) && currentMs > 0 && currentMs % multipleOfMs === 0;
  if (!isAlignedToMultiple) {
    return { min: baseMin, step: 1 };
  }

  const step = stepFromMultipleMs(multipleOfMs, unit);
  // When the multiple can't be expressed as a whole number of the current unit (e.g. a previous
  // interval of 12h shown while this field is in days), a fractional step would be awkward — fall
  // back to stepping by 1 instead.
  if (!Number.isInteger(step)) {
    return { min: baseMin, step: 1 };
  }

  return { min: step, step };
};

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
  // Convert a numeric value + unit into milliseconds.
  // Returns `-1` when the input cannot be parsed.
  return ms === undefined ? -1 : ms;
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

export const parseIntervalWithDefaultUnit = (
  duration: string | undefined,
  defaultUnit: PreservedTimeUnit = 'd'
): { value: string; unit: PreservedTimeUnit } => {
  const parsed = parseInterval(duration);
  return {
    value: parsed?.value ?? '',
    unit: parsed?.unit ?? defaultUnit,
  };
};

export const formatDuration = (
  value: string | undefined,
  unit: string | undefined,
  {
    integerOnly = false,
    minInclusive,
    minExclusive,
  }: {
    integerOnly?: boolean;
    minInclusive?: number;
    minExclusive?: number;
  } = {}
): string | undefined => {
  if (!value || value.trim() === '') return;
  if (!unit) return;
  const num = Number(value);
  // A NaN/Infinity duration is never meaningful, so never emit "NaNd"/"Infinityd" regardless of the
  // caller's options. Negative values stay allowed unless a `minInclusive`/`minExclusive` bound is
  // given — the DLM live preview intentionally keeps a negative frozen_after to render the phase.
  if (!Number.isFinite(num)) return;
  if (integerOnly && !Number.isInteger(num)) return;
  if (minInclusive !== undefined && num < minInclusive) return;
  if (minExclusive !== undefined && num <= minExclusive) return;
  return `${num}${unit}`;
};
