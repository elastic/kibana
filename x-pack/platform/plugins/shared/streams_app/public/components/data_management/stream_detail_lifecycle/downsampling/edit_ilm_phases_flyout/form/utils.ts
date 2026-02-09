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

export function toMilliseconds(value: string, unit: TimeUnit): number {
  if (value.trim() === '') return -1;
  const num = Number(value);
  if (!Number.isFinite(num)) return Number.NaN;
  return num * TIME_UNIT_TO_MILLISECONDS[unit];
}

export function parseInterval(
  duration: string | undefined
): { value: string; unit: TimeUnit } | undefined {
  if (!duration) return;
  const result = /^(\d+(?:\.\d+)?)([dhms])$/.exec(duration);
  if (!result) return;
  return { value: result[1], unit: result[2] as TimeUnit };
}

export function formatMillisecondsInUnit(ms: number, unit: TimeUnit, precision = 2): string {
  const valueInUnit = ms / TIME_UNIT_TO_MILLISECONDS[unit];
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
