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
  upperBoundMs: number | undefined;
  /** The next phase that produced the upper bound, if any. */
  upperBoundPhase: P | undefined;
}

/**
 * Compute the bounds for a phase's timing/interval relative to its neighbors: the largest value
 * among earlier phases (lower bound) and the smallest value among later phases (upper bound), plus
 * which phase set each. On equal values the phase closest to the current one wins, so the help text
 * references the actual adjacent phase.
 */
export function getRelativeBoundsInMs<P extends string>(
  orderedPhases: ReadonlyArray<P>,
  currentPhase: P,
  getValueMsForPhase: (phase: P) => number | null,
  { defaultLowerBoundMs = 0 }: { defaultLowerBoundMs?: number } = {}
): RelativeBounds<P> {
  const currentIndex = orderedPhases.indexOf(currentPhase);
  if (currentIndex < 0) {
    return {
      lowerBoundMs: defaultLowerBoundMs,
      lowerBoundPhase: undefined,
      upperBoundMs: undefined,
      upperBoundPhase: undefined,
    };
  }

  const previousPhases = currentIndex > 0 ? orderedPhases.slice(0, currentIndex) : [];
  const nextPhases = orderedPhases.slice(currentIndex + 1);

  let lowerBoundMs = defaultLowerBoundMs;
  let lowerBoundPhase: P | undefined;
  for (const phase of previousPhases) {
    const ms = getValueMsForPhase(phase);
    if (ms === null) continue;
    // Previous phases are iterated from farthest to closest, so on a tie the closer phase takes
    // over once a bound has been attributed (`>=`); attribution itself still requires exceeding
    // the default bound (`>`).
    if (lowerBoundPhase === undefined ? ms > lowerBoundMs : ms >= lowerBoundMs) {
      lowerBoundMs = ms;
      lowerBoundPhase = phase;
    }
  }

  let upperBoundMs: number | undefined;
  let upperBoundPhase: P | undefined;
  for (const phase of nextPhases) {
    const ms = getValueMsForPhase(phase);
    if (ms === null) continue;
    // Next phases are iterated from closest to farthest, so a strict `<` keeps the closer phase
    // on a tie.
    if (upperBoundMs === undefined || ms < upperBoundMs) {
      upperBoundMs = ms;
      upperBoundPhase = phase;
    }
  }

  return { lowerBoundMs, lowerBoundPhase, upperBoundMs, upperBoundPhase };
}
