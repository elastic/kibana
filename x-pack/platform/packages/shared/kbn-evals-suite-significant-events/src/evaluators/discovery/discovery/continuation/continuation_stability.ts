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
  producedSlugs: string[];

  steps?: ConverseStep[];
}

export interface ContinuationStabilityResult {
  /** Fraction of comparable post-establishing cycles that reused an already-seen slug; null when not gradable. */
  score: number | null;
  /** Cycles after the establishing cycle that reused a prior slug. */
  reusedCycles: number;
  /** Cycles after the establishing cycle that were gradable (produced at least one slug). */
  comparableCycles: number;
  /** Post-establishing cycles that produced no discovery at all — excluded from scoring. */
  emptyCycles: number;
  /** Distinct slugs across the whole run — ideal is 1 for a single cascade. */
  distinctSlugs: number;
  explanation: string;
}

/**
 * Score whether related detections arriving one-at-a-time fold into the SAME slug rather than
 * proliferating new ones. score = reusedCycles / comparableCycles (a cycle is "reused" when any slug
 * it produced was already seen). Null when there are fewer than two gradable cycles.
 *
 * A post-establishing cycle that produced NO discovery at all (`producedSlugs: []`) is excluded
 * from `comparableCycles` rather than counted as a continuation miss — "the agent produced
 * nothing" and "the agent produced a discovery under the wrong slug" are different failure modes,
 * and conflating them let an unrelated zero-output cycle silently deflate the same score meant to
 * measure routing correctness. Mirrors how leading empty cycles are already skipped before the
 * episode is established.
 */
export function scoreContinuationStability(
  cycles: ContinuationCycle[]
): ContinuationStabilityResult {
  const seen = new Set<string>();
  const allSlugs = new Set<string>();
  let reusedCycles = 0;
  let comparableCycles = 0;
  let emptyCycles = 0;
  let establishedFirstCycle = false;

  cycles.forEach((cycle) => {
    const slugs = cycle.producedSlugs.filter(Boolean);

    if (!establishedFirstCycle) {
      // The establishing cycle seeds the "seen" set; it is never graded for reuse. Skip empty
      // leading cycles so the first cycle that actually produces a slug establishes the event.
      if (slugs.length > 0) {
        slugs.forEach((slug) => {
          seen.add(slug);
          allSlugs.add(slug);
        });
        establishedFirstCycle = true;
      }
      return;
    }

    if (slugs.length === 0) {
      emptyCycles += 1;
      return;
    }

    comparableCycles += 1;
    const reused = slugs.some((slug) => seen.has(slug));
    if (reused) {
      reusedCycles += 1;
    }
    slugs.forEach((slug) => {
      seen.add(slug);
      allSlugs.add(slug);
    });
  });

  const emptyNote =
    emptyCycles > 0 ? `; ${emptyCycles} cycle(s) produced no discovery and were excluded` : '';

  if (comparableCycles === 0) {
    return {
      score: null,
      reusedCycles: 0,
      comparableCycles: 0,
      emptyCycles,
      distinctSlugs: allSlugs.size,
      explanation:
        'Fewer than two gradable cycles — nothing to continue (need an establishing cycle plus ' +
        `at least one follow-up)${emptyNote}`,
    };
  }

  const score = reusedCycles / comparableCycles;
  return {
    score,
    reusedCycles,
    comparableCycles,
    emptyCycles,
    distinctSlugs: allSlugs.size,
    explanation:
      `${reusedCycles}/${comparableCycles} follow-up cycle(s) reused an established slug ` +
      `(${allSlugs.size} distinct slug(s) across the run; ideal is 1 for a single cascade)${emptyNote}`,
  };
}

/** Output shape produced by the sequential "continuation over time" discovery agent. */
export interface ContinuationStabilityOutput {
  cycles: ContinuationCycle[];
}

export type ContinuationEvaluator = Evaluator<Example, ContinuationStabilityOutput>;

/** CODE evaluator: scores whether re-arriving detections reuse one stable slug. Score = reused / comparable cycles. */
export const continuationStabilityEvaluator: ContinuationEvaluator = {
  name: 'continuation_stability',
  kind: 'CODE',
  evaluate: ({ output }) => Promise.resolve(scoreContinuationStability(output.cycles ?? [])),
};
