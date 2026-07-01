/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Intentionally copied from @kbn/evals — pending future extraction to @kbn/evals-common.

import { geometricMeanClaimScore, type ClaimScoreMap } from '../claim_scoring';
import type { GroundednessAnalysis } from './types';

// Scoring weights based on the severity of each error type.
// Keys must match the `verdict` enum emitted by the LLM judge (see ./prompt.ts and ./types.ts).
const CLAIM_FACTUAL_SCORE_MAP: ClaimScoreMap = {
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
};

/**
 * Calculates the groundedness score using geometric mean of individual claim scores.
 *
 * This function computes the geometric mean of the scores assigned to each claim,
 * ensuring that a single critically incorrect claim (such as a contradicted central claim
 * with a score of 0.0) will result in an overall groundedness score of 0.0.
 */
export function calculateGroundednessScore(groundednessAnalysis: GroundednessAnalysis): number {
  return geometricMeanClaimScore(
    groundednessAnalysis?.analysis,
    CLAIM_FACTUAL_SCORE_MAP,
    'NOT_FOUND'
  );
}
