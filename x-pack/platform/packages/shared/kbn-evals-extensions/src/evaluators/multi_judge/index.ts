/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';

export type AggregationStrategy = 'majority-vote' | 'median' | 'weighted-average' | 'borda-count';

export interface MultiJudgeConfig {
  /**
   * The evaluators to aggregate.
   */
  evaluators: Evaluator[];
  /**
   * Aggregation strategy for combining scores.
   */
  strategy: AggregationStrategy;
  /**
   * Optional weights per evaluator (keyed by name). Only used with 'weighted-average'.
   * Defaults to equal weighting.
   */
  weights?: Record<string, number>;
  /**
   * Threshold for majority-vote: a score >= this is considered a "pass" vote.
   * Defaults to 0.5.
   */
  passThreshold?: number;
}

interface JudgeBreakdown {
  evaluator: string;
  score: number | null;
  label: string | null | undefined;
}

const aggregateMajorityVote = (
  scores: Array<{ score: number; name: string }>,
  passThreshold: number
): number => {
  const passCount = scores.filter((s) => s.score >= passThreshold).length;
  return passCount / scores.length;
};

const aggregateMedian = (scores: Array<{ score: number }>): number => {
  const sorted = [...scores].sort((a, b) => a.score - b.score);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1].score + sorted[mid].score) / 2;
  }
  return sorted[mid].score;
};

const aggregateWeightedAverage = (
  scores: Array<{ score: number; name: string }>,
  weights: Record<string, number>
): number => {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { score, name } of scores) {
    const weight = weights[name] ?? 1;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

const aggregateBordaCount = (scores: Array<{ score: number; name: string }>): number => {
  // Rank scores: highest score gets rank N-1, lowest gets 0
  const sorted = [...scores].sort((a, b) => a.score - b.score);
  const maxRank = sorted.length - 1;
  const totalPossible = maxRank > 0 ? (maxRank * (maxRank + 1)) / 2 : 1;
  const totalRank = sorted.reduce((sum, _, idx) => sum + idx, 0);

  return totalPossible > 0 ? totalRank / totalPossible : 0;
};

/**
 * Creates a multi-judge evaluator that wraps multiple evaluators and
 * aggregates their scores using the specified strategy.
 */
export const createMultiJudgeEvaluator = (config: MultiJudgeConfig): Evaluator => ({
  name: `multi-judge-${config.strategy}`,
  kind: 'LLM',
  evaluate: async (params) => {
    const judgeResults: JudgeBreakdown[] = [];
    const validScores: Array<{ score: number; name: string }> = [];

    // Run all evaluators
    const results = await Promise.all(
      config.evaluators.map(async (evaluator): Promise<[string, EvaluationResult]> => {
        const result = await evaluator.evaluate(params);
        return [evaluator.name, result];
      })
    );

    for (const [name, result] of results) {
      judgeResults.push({
        evaluator: name,
        score: result.score ?? null,
        label: result.label,
      });

      if (result.score != null) {
        validScores.push({ score: result.score, name });
      }
    }

    if (validScores.length === 0) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No judges returned valid scores',
        metadata: { judges: judgeResults, strategy: config.strategy },
      };
    }

    let aggregatedScore: number;
    const passThreshold = config.passThreshold ?? 0.5;

    switch (config.strategy) {
      case 'majority-vote':
        aggregatedScore = aggregateMajorityVote(validScores, passThreshold);
        break;
      case 'median':
        aggregatedScore = aggregateMedian(validScores);
        break;
      case 'weighted-average':
        aggregatedScore = aggregateWeightedAverage(validScores, config.weights ?? {});
        break;
      case 'borda-count':
        aggregatedScore = aggregateBordaCount(validScores);
        break;
    }

    return {
      score: aggregatedScore,
      label: aggregatedScore >= 0.8 ? 'pass' : aggregatedScore >= 0.5 ? 'warn' : 'fail',
      explanation: `${config.strategy} aggregation of ${
        validScores.length
      } judges: ${aggregatedScore.toFixed(3)}`,
      metadata: {
        judges: judgeResults,
        strategy: config.strategy,
        validJudgeCount: validScores.length,
      },
    };
  },
});
