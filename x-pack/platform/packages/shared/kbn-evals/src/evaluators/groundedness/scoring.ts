/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroundednessAnalysis } from './types';

// Scoring weights based on the severity of each error type.
// Keys must match the `verdict` enum emitted by the LLM judge (see ./prompt.ts and ./types.ts).
const CLAIM_FACTUAL_SCORE_MAP = {
  FULLY_SUPPORTED: 1.0,
  PARTIALLY_SUPPORTED: {
    central: 0.9,
    peripheral: 0.95,
  },
  CONTRADICTED: {
    central: 0.0,
    peripheral: 0.1,
  },
  NOT_FOUND: {
    central: 0.1,
    peripheral: 0.5,
  },
  UNGROUNDED_BUT_DISCLOSED: {
    central: 0.75,
    peripheral: 0.9,
  },
} as const;

// The agent's own procedural/meta sentences, which are not claims about the environment
// (see ./system_prompt.text, step 1). They carry no groundedness weight, so they leave the
// score product instead of being weighted inside it, and this verdict is deliberately
// absent from CLAIM_FACTUAL_SCORE_MAP.
const NON_FACTUAL_VERDICT = 'NON_FACTUAL';

/**
 * Calculates the groundedness score using geometric mean of individual claim scores.
 *
 * This function computes the geometric mean of the scores assigned to each claim,
 * ensuring that a single critically incorrect claim (such as a contradicted central claim
 * with a score of 0.0) will result in an overall groundedness score of 0.0.
 */
export function calculateGroundednessScore(groundednessAnalysis: GroundednessAnalysis): number {
  const analysis = groundednessAnalysis?.analysis;
  if (!analysis || !Array.isArray(analysis) || analysis.length === 0) {
    return 0.0;
  }

  const factualClaims = analysis.filter((claim) => claim.verdict !== NON_FACTUAL_VERDICT);
  if (factualClaims.length === 0) {
    // Every sentence was the agent's own procedural/meta text: no claim about the
    // environment was made, so nothing about it can be ungrounded.
    return 1.0;
  }

  let productOfScores = 1.0;
  for (const claim of factualClaims) {
    const verdict = claim.verdict || 'NOT_FOUND';
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
  const numClaims = factualClaims.length;
  const score = productOfScores > 0 ? Math.pow(productOfScores, 1 / numClaims) : 0.0;

  return score;
}
