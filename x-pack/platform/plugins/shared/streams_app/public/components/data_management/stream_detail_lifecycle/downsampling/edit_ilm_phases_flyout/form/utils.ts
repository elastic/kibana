/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsTimeUnit } from '../../../helpers/format_size_units';
import { splitSizeAndUnits, toMillis } from '../../../helpers/format_size_units';

export function toMilliseconds(value: string, unit: StreamsTimeUnit): number {
  if (value.trim() === '') return -1;
  const resolvedValue = value.trim();
  const ms = toMillis(`${resolvedValue}${unit}`);
  return ms === undefined ? Number.NaN : ms;
}

export function parseInterval(
  duration: string | undefined
): { value: string; unit: StreamsTimeUnit } | undefined {
  if (!duration) return;

  // Preserve the original unit from ILM policies (e.g. `ms`, `micros`, `nanos`).
  // Streams flyout only *offers* d/h/m/s by default, but can display and round-trip other units.
  const { size, unit } = splitSizeAndUnits(duration);
  if (!size || !unit) return;
  if (toMillis(`1${unit}`) === undefined) return;
  return { value: size, unit: unit as StreamsTimeUnit };
}

export function formatMillisecondsInUnit(ms: number, unit: string, precision = 2): string {
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
}

export function getRelativeBoundsInMs<P extends string>(
  orderedPhases: ReadonlyArray<P>,
  currentPhase: P,
  getValueMsForPhase: (phase: P) => number | null,
  { defaultLowerBoundMs = 0 }: { defaultLowerBoundMs?: number } = {}
): { lowerBoundMs: number; upperBoundMs: number | undefined } {
  const currentIndex = orderedPhases.indexOf(currentPhase);
  if (currentIndex < 0) {
    return { lowerBoundMs: defaultLowerBoundMs, upperBoundMs: undefined };
  }

  const previousPhases = currentIndex > 0 ? orderedPhases.slice(0, currentIndex) : [];
  const nextPhases = orderedPhases.slice(currentIndex + 1);

  const lowerBoundMs = previousPhases.reduce((maxMs, phase) => {
    const ms = getValueMsForPhase(phase);
    return ms === null ? maxMs : Math.max(maxMs, ms);
  }, defaultLowerBoundMs);

  const upperBoundMs = nextPhases.reduce<number | undefined>((minMs, phase) => {
    const ms = getValueMsForPhase(phase);
    if (ms === null) return minMs;
    return minMs === undefined ? ms : Math.min(minMs, ms);
  }, undefined);

  return { lowerBoundMs, upperBoundMs };
}
