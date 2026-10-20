/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type Centrality = 'central' | 'peripheral';
type ScoreMapEntry = number | Record<Centrality, number>;
export type ClaimScoreMap = Record<string, ScoreMapEntry>;

interface ClaimWithVerdict {
  verdict?: string;
  centrality?: string;
}

/**
 * Calculates a claim-based score using the geometric mean of individual claim scores.
 *
 * Computes the geometric mean of the scores assigned to each claim so that a single
 * critically incorrect claim (such as a contradicted central claim scoring 0.0) drives
 * the overall score to 0.0. Each evaluator supplies its own `scoreMap` (verdict weights)
 * and `defaultVerdict` fallback for claims missing a verdict.
 */
export const geometricMeanClaimScore = (
  claims: ClaimWithVerdict[] | undefined,
  scoreMap: ClaimScoreMap,
  defaultVerdict: string
): number => {
  if (!claims || !Array.isArray(claims) || claims.length === 0) {
    return 0.0;
  }

  let productOfScores = 1.0;
  for (const claim of claims) {
    const verdict = claim.verdict || defaultVerdict;
    const centrality = claim.centrality || 'peripheral';

    const scoreMapEntry = scoreMap[verdict];

    let claimScore = 0.0;
    if (typeof scoreMapEntry === 'object') {
      claimScore = scoreMapEntry[centrality as Centrality] || 0.0;
    } else if (typeof scoreMapEntry === 'number') {
      claimScore = scoreMapEntry;
    }

    productOfScores *= claimScore;
  }

  const numClaims = claims.length;
  return productOfScores > 0 ? Math.pow(productOfScores, 1 / numClaims) : 0.0;
};
