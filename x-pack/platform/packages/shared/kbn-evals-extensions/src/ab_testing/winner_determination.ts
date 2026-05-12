/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PairwiseEvaluatorResult, PairwiseJudgeResult } from '../types';

/**
 * Determines the aggregate winner from evaluator-level comparisons and optional judge results.
 *
 * Voting scheme:
 * 1. Each evaluator with a non-tie direction casts a vote (A or B)
 * 2. Each judge result with a non-tie winner casts a vote (weighted by confidence)
 * 3. The side with more weighted votes wins; ties remain ties
 */
export const determineWinner = (
  perEvaluator: PairwiseEvaluatorResult[],
  judgeResults?: PairwiseJudgeResult[]
): 'A' | 'B' | 'tie' => {
  let voteA = 0;
  let voteB = 0;

  // Evaluator votes (equal weight per evaluator, weighted by absolute delta)
  for (const result of perEvaluator) {
    if (result.direction === 'A_better') {
      voteA += Math.abs(result.delta);
    } else if (result.direction === 'B_better') {
      voteB += Math.abs(result.delta);
    }
  }

  // Judge votes (weighted by confidence)
  if (judgeResults) {
    for (const judge of judgeResults) {
      if (judge.winner === 'A') {
        voteA += judge.confidence;
      } else if (judge.winner === 'B') {
        voteB += judge.confidence;
      }
    }
  }

  // Determine winner with a small epsilon for ties
  const epsilon = 0.001;
  if (Math.abs(voteA - voteB) < epsilon) {
    return 'tie';
  }

  return voteA > voteB ? 'A' : 'B';
};
