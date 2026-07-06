/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  formatDuration,
  parseInterval,
  parseIntervalWithDefaultUnit,
  toMilliseconds,
} from '../../shared';

export interface RelativeBounds<P extends string> {
  lowerBoundMs: number;
  /** The previous phase that produced the lower bound, if any actually constrains it. */
  lowerBoundPhase: P | undefined;
}

/**
 * Compute the lower bound for a phase's timing/interval based on the previous phases: the largest
 * value among earlier phases, and which phase set it. Help text only references the previous
 * (lower) boundary, so no upper bound is computed.
 */
export function getRelativeBoundsInMs<P extends string>(
  orderedPhases: ReadonlyArray<P>,
  currentPhase: P,
  getValueMsForPhase: (phase: P) => number | null,
  { defaultLowerBoundMs = 0 }: { defaultLowerBoundMs?: number } = {}
): RelativeBounds<P> {
  const currentIndex = orderedPhases.indexOf(currentPhase);
  if (currentIndex < 0) {
    return { lowerBoundMs: defaultLowerBoundMs, lowerBoundPhase: undefined };
  }

  const previousPhases = currentIndex > 0 ? orderedPhases.slice(0, currentIndex) : [];

  let lowerBoundMs = defaultLowerBoundMs;
  let lowerBoundPhase: P | undefined;
  for (const phase of previousPhases) {
    const ms = getValueMsForPhase(phase);
    if (ms === null) continue;
    // Track the previous phase that sets the largest (binding) lower bound.
    if (ms > lowerBoundMs) {
      lowerBoundMs = ms;
      lowerBoundPhase = phase;
    }
  }

  return { lowerBoundMs, lowerBoundPhase };
}
