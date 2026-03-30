/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { formatMillisecondsInUnit, parseInterval, toMilliseconds } from '../../shared';

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
