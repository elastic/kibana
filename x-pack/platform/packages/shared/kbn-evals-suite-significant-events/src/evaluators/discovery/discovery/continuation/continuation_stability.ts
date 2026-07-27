/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep, Evaluator, Example } from '@kbn/evals';

/** One discovery agent invocation in a sequential "detections over time" run. */
export interface ContinuationCycle {
  /** rule_name of the detection fed this cycle — for human-readable explanations only. */
  ruleName?: string;
  /** event_id(s) the agent emitted this cycle (one per produced discovery). */
  producedEventIds: string[];

  /** Whether this cycle should reuse an established event ID. Defaults to true. */
  expectReuse?: boolean;
  /** Whether this cycle must perform a topology-filtered event search. */
  expectTopologyEventSearch?: boolean;
  /** Event IDs explicitly supplied by the agent to discovery_write, before handler deduplication. */
  requestedEventIds?: string[];

  steps?: ConverseStep[];
}

export interface ContinuationStabilityResult {
  /** Fraction of comparable post-establishing cycles that matched the expected reuse decision. */
  score: number | null;
  /** Cycles whose actual reuse decision matched expectReuse. */
  correctCycles: number;
  /** Cycles after the establishing cycle that reused a prior event ID. */
  reusedCycles: number;
  /** Cycles after the establishing cycle that were gradable (produced at least one event ID). */
  comparableCycles: number;
  /** Post-establishing cycles excluded from scoring (no discovery produced, or not gradable by this scorer). */
  emptyCycles: number;
  /** Distinct event IDs across the whole run — ideal is 1 for a single cascade. */
  distinctEventIds: number;
  explanation: string;
}

interface ContinuationScoreState {
  readonly seenEventIds: ReadonlySet<string>;
  readonly allEventIds: ReadonlySet<string>;
  readonly established: boolean;
  readonly reusedCycles: number;
  readonly correctCycles: number;
  readonly comparableCycles: number;
  readonly emptyCycles: number;
}

interface ContinuationScoreOptions {
  readonly cycles: ContinuationCycle[];
  readonly isReuse: (cycle: ContinuationCycle, seenEventIds: ReadonlySet<string>) => boolean;
  /** When provided, cycles failing this predicate are excluded from scoring but still feed seen event IDs. */
  readonly isGradable?: (cycle: ContinuationCycle) => boolean;
  readonly noComparableExplanation: string;
  readonly resultExplanation: (state: ContinuationScoreState) => string;
}

const initialScoreState: ContinuationScoreState = {
  seenEventIds: new Set(),
  allEventIds: new Set(),
  established: false,
  reusedCycles: 0,
  correctCycles: 0,
  comparableCycles: 0,
  emptyCycles: 0,
};

const scoreContinuation = ({
  cycles,
  isReuse,
  isGradable,
  noComparableExplanation,
  resultExplanation,
}: ContinuationScoreOptions): ContinuationStabilityResult => {
  const state = cycles.reduce<ContinuationScoreState>((current, cycle) => {
    const producedEventIds = cycle.producedEventIds.filter(Boolean);
    if (!current.established) {
      return producedEventIds.length === 0
        ? current
        : {
            ...current,
            seenEventIds: new Set(producedEventIds),
            allEventIds: new Set(producedEventIds),
            established: true,
          };
    }
    if (producedEventIds.length === 0) {
      return { ...current, emptyCycles: current.emptyCycles + 1 };
    }
    if (isGradable && !isGradable(cycle)) {
      return {
        ...current,
        seenEventIds: new Set([...current.seenEventIds, ...producedEventIds]),
        allEventIds: new Set([...current.allEventIds, ...producedEventIds]),
        emptyCycles: current.emptyCycles + 1,
      };
    }

    const reused = isReuse(cycle, current.seenEventIds);
    return {
      ...current,
      seenEventIds: new Set([...current.seenEventIds, ...producedEventIds]),
      allEventIds: new Set([...current.allEventIds, ...producedEventIds]),
      reusedCycles: current.reusedCycles + Number(reused),
      correctCycles: current.correctCycles + Number(reused === (cycle.expectReuse ?? true)),
      comparableCycles: current.comparableCycles + 1,
    };
  }, initialScoreState);

  const emptyNote =
    state.emptyCycles > 0 ? `; ${state.emptyCycles} cycle(s) were excluded from scoring` : '';
  if (state.comparableCycles === 0) {
    return {
      score: null,
      correctCycles: 0,
      reusedCycles: 0,
      comparableCycles: 0,
      emptyCycles: state.emptyCycles,
      distinctEventIds: state.allEventIds.size,
      explanation: `${noComparableExplanation}${emptyNote}`,
    };
  }

  return {
    score: state.correctCycles / state.comparableCycles,
    correctCycles: state.correctCycles,
    reusedCycles: state.reusedCycles,
    comparableCycles: state.comparableCycles,
    emptyCycles: state.emptyCycles,
    distinctEventIds: state.allEventIds.size,
    explanation: `${resultExplanation(state)}${emptyNote}`,
  };
};

/**
 * Score whether related detections arriving one-at-a-time fold into the same event ID rather than
 * proliferating new ones.
 */
export const scoreContinuationStability = (
  cycles: ContinuationCycle[]
): ContinuationStabilityResult =>
  scoreContinuation({
    cycles,
    isReuse: (cycle, seenEventIds) =>
      cycle.producedEventIds.some((eventId) => seenEventIds.has(eventId)),
    noComparableExplanation:
      'Fewer than two gradable cycles — nothing to continue (need an establishing cycle plus at least one follow-up)',
    resultExplanation: (state) =>
      `${state.correctCycles}/${state.comparableCycles} follow-up cycle(s) matched the expected ` +
      `reuse decision; ${state.reusedCycles} actually reused an established event ID ` +
      `(${state.allEventIds.size} distinct event ID(s) across the run)`,
  });

/**
 * Score the agent's routing decision independently from the write handler's final event ID.
 * This prevents write-time deduplication from being mistaken for an agent-selected continuation.
 */
export const scoreContinuationRouting = (
  cycles: ContinuationCycle[]
): ContinuationStabilityResult =>
  scoreContinuation({
    cycles,
    isReuse: (cycle, seenEventIds) =>
      (cycle.requestedEventIds ?? []).some((eventId) => seenEventIds.has(eventId)),
    // `undefined` means routing was not captured (instrumentation gap) — ungradable; `[]` is a
    // genuine agent omission and stays gradable.
    isGradable: (cycle) => cycle.requestedEventIds !== undefined,
    noComparableExplanation:
      'Fewer than two gradable cycles — no follow-up routing decision to score',
    resultExplanation: (state) =>
      `${state.correctCycles}/${state.comparableCycles} follow-up cycle(s) made the expected ` +
      `explicit routing decision; ${state.reusedCycles} explicitly selected an established event_id`,
  });

/** Output shape produced by the sequential "continuation over time" discovery agent. */
export interface ContinuationStabilityOutput {
  cycles: ContinuationCycle[];
}

export type ContinuationEvaluator = Evaluator<Example, ContinuationStabilityOutput>;

/** CODE evaluator: scores whether re-arriving detections reuse one stable event ID. */
export const continuationStabilityEvaluator: ContinuationEvaluator = {
  name: 'continuation_stability',
  kind: 'CODE',
  evaluate: ({ output }) => Promise.resolve(scoreContinuationStability(output.cycles ?? [])),
};

/** CODE evaluator: scores explicit continuation routing before handler-generated outcomes. */
export const continuationRoutingEvaluator: ContinuationEvaluator = {
  name: 'continuation_routing',
  kind: 'CODE',
  evaluate: ({ output }) => Promise.resolve(scoreContinuationRouting(output.cycles ?? [])),
};
