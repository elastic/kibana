/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PairwiseExperimentResult, PairwiseEvaluatorResult } from '../types';
import { computePairwiseResults } from '../scoring/pairwise';
import { testSignificance } from './significance';
import { determineWinner } from './winner_determination';

interface PairwiseExperimentInput {
  skillAId: string;
  skillBId: string;
  datasetId: string;
  /**
   * Per-evaluator score arrays, keyed by evaluator name.
   * Each entry contains parallel arrays of scores for variant A and B.
   */
  evaluatorScores: Record<string, { scoresA: number[]; scoresB: number[] }>;
  /**
   * Optional pairwise judge results (from LLM-as-judge comparisons).
   */
  judgeResults?: Array<{
    exampleIndex: number;
    winner: 'A' | 'B' | 'tie';
    explanation: string;
    confidence: number;
  }>;
}

/**
 * Runs a complete pairwise experiment analysis given pre-computed scores.
 *
 * This function does NOT execute the actual evaluation — it takes already-computed
 * scores and produces the full comparison result including significance testing.
 */
export const runPairwiseExperiment = (input: PairwiseExperimentInput): PairwiseExperimentResult => {
  const { skillAId, skillBId, datasetId, evaluatorScores, judgeResults } = input;

  // Compute per-evaluator pairwise results
  const perEvaluator: PairwiseEvaluatorResult[] = computePairwiseResults(evaluatorScores);

  // Aggregate all scores for significance testing
  const allScoresA = Object.values(evaluatorScores).flatMap((e) => e.scoresA);
  const allScoresB = Object.values(evaluatorScores).flatMap((e) => e.scoresB);

  const significance = testSignificance(allScoresA, allScoresB);

  const aggregateWinner = determineWinner(perEvaluator, judgeResults);

  return {
    skillAId,
    skillBId,
    datasetId,
    perEvaluator,
    pairwiseJudgeResults: judgeResults,
    aggregateWinner,
    significance,
    timestamp: new Date().toISOString(),
  };
};
