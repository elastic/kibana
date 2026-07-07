/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '../../types';
import { createQuantitativeCorrectnessEvaluators } from '.';
import type { CorrectnessAnalysis } from './types';

const FACTUALITY_EVALUATOR_NAME = 'Factuality';

// Per-claim weights, mirroring the shared `CLAIM_FACTUAL_SCORE_MAP` in
// `./scoring`. Kept as a separate constant so this additive scorer is
// self-contained and never mutates the shared scorer that the context-engine
// framework depends on.
const CLAIM_FACTUAL_SCORE_MAP = {
  FULLY_SUPPORTED: 1.0,
  PARTIALLY_SUPPORTED: { central: 0.9, peripheral: 0.95 },
  CONTRADICTED: { central: 0.0, peripheral: 0.1 },
  NOT_IN_GROUND_TRUTH: { central: 0.1, peripheral: 0.5 },
} as const;

/**
 * Security/agent-builder Factuality scorer.
 *
 * The shared `calculateFactualScore` (`./scoring`) computes a geometric mean
 * over ALL claims, including `NOT_IN_GROUND_TRUTH` (statements the reference
 * neither supports nor contradicts). Because the mean is a product, each such
 * extra claim multiplicatively crushes the score: a fully accurate answer that
 * is richer than a (often thin) reference lands at a uniform ~0.1–0.3,
 * indistinguishable from a genuinely inaccurate one. This is worst where ground
 * truth is sparsest (e.g. multi-turn), and is a scoring artifact, not a model
 * gap (see elastic/security-team#18060).
 *
 * This scorer scores factuality only over the claims that CAN be checked
 * against the reference (FULLY_SUPPORTED / PARTIALLY_SUPPORTED / CONTRADICTED),
 * so a grounded-but-richer answer is no longer penalized for its extra detail.
 * Reference coverage is already measured separately by the Relevance score. The
 * deliberate geometric-mean intent is preserved: a single contradicted central
 * claim still tanks the score to 0. When every claim is unverifiable (no
 * reference overlap at all) the original behaviour is retained so a fully
 * off-reference answer is not rewarded with a perfect score.
 *
 * This is an additive, opt-in evaluator: the shared `calculateFactualScore`
 * remains untouched, so the context-engine framework's numbers do not diverge
 * (per reviewer guidance on #276536 / #276331).
 */
export function calculateAgentBuilderFactualScore(
  correctnessEvaluation: CorrectnessAnalysis
): number {
  const analysis = correctnessEvaluation?.analysis;
  if (!analysis || !Array.isArray(analysis) || analysis.length === 0) {
    return 0.0;
  }

  const verifiableClaims = analysis.filter(
    (claim) => (claim.verdict || 'NOT_IN_GROUND_TRUTH') !== 'NOT_IN_GROUND_TRUTH'
  );
  const scoredClaims = verifiableClaims.length > 0 ? verifiableClaims : analysis;

  let productOfScores = 1.0;
  for (const claim of scoredClaims) {
    const verdict = claim.verdict || 'NOT_IN_GROUND_TRUTH';
    const centrality = claim.centrality || 'peripheral';
    const scoreMapEntry = CLAIM_FACTUAL_SCORE_MAP[verdict as keyof typeof CLAIM_FACTUAL_SCORE_MAP];

    let claimScore = 0.0;
    if (typeof scoreMapEntry === 'object') {
      claimScore = scoreMapEntry[centrality as keyof typeof scoreMapEntry] || 0.0;
    } else if (typeof scoreMapEntry === 'number') {
      claimScore = scoreMapEntry;
    }

    productOfScores *= claimScore;
  }

  // Geometric mean: n-th root of the product
  const numClaims = scoredClaims.length;
  return productOfScores > 0 ? Math.pow(productOfScores, 1 / numClaims) : 0.0;
}

/**
 * Common security/agent-builder correctness evaluators: wraps the shared
 * `createQuantitativeCorrectnessEvaluators` and overrides ONLY the Factuality
 * score with `calculateAgentBuilderFactualScore` (NOT_IN_GROUND_TRUTH-excluded
 * geometric mean). Relevance and Sequence Accuracy are reused unchanged from
 * the shared factory, so the evaluator name list (and therefore the report
 * columns / regression coverage) is identical to the default correctness set.
 *
 * Security suites should use this instead of `createQuantitativeCorrectnessEvaluators`
 * so grounded-but-richer answers aren't near-zeroed by a thin reference, while
 * the shared default scorer stays available and unchanged for other frameworks.
 */
export function createAgentBuilderCorrectnessEvaluators(): Evaluator[] {
  const shared = createQuantitativeCorrectnessEvaluators();

  return shared.map((evaluator) =>
    evaluator.name === FACTUALITY_EVALUATOR_NAME
      ? {
          ...evaluator,
          evaluate: async (args) => {
            const correctnessAnalysis = ((args.output as any)?.correctnessAnalysis ??
              null) as CorrectnessAnalysis | null;

            if (!correctnessAnalysis) {
              return {
                score: null,
                label: 'unavailable',
                explanation: 'No correctness analysis available',
                metadata: (args.metadata ?? undefined) as Record<string, unknown> | undefined,
              };
            }

            const score = calculateAgentBuilderFactualScore(correctnessAnalysis);
            const summaryText = correctnessAnalysis.summary.factual_accuracy_summary;

            return {
              score,
              label: summaryText,
              explanation: summaryText,
              metadata: {
                ...((args.metadata as Record<string, unknown>) ?? {}),
                correctnessAnalysis,
              },
            };
          },
        }
      : evaluator
  );
}
