/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '../../types';

type AggregationStrategy = 'mean' | 'median' | 'majority';

function computeMean(scores: number[]): number {
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

function computeMedian(scores: number[]): number {
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeMajority(scores: number[]): number {
  const rounded = scores.map((s) => (s >= 0.5 ? 1 : 0));
  const ones = rounded.filter((s) => s === 1).length;
  return ones > rounded.length / 2 ? 1 : 0;
}

export function createMultiJudgeEvaluator(config: {
  judges: Evaluator[];
  strategy?: AggregationStrategy;
  logger?: { warn: (msg: string) => void };
}): Evaluator {
  const { judges, strategy = 'mean', logger } = config;

  const hasLlmJudge = judges.some((judge) => judge.kind === 'LLM');

  return {
    name: 'multi-judge',
    kind: hasLlmJudge ? 'LLM' : 'CODE',
    evaluate: async (params) => {
      const results = await Promise.allSettled(judges.map((judge) => judge.evaluate(params)));

      const judgeResults: Array<{ name: string; result: EvaluationResult }> = [];
      const scores: number[] = [];

      const failedJudges: Array<{ name: string; error: string }> = [];

      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          judgeResults.push({ name: judges[i].name, result: result.value });
          if (result.value.score != null) {
            scores.push(result.value.score);
          }
        } else {
          const errorMessage =
            result.reason instanceof Error ? result.reason.message : String(result.reason);
          failedJudges.push({ name: judges[i].name, error: errorMessage });
          logger?.warn(`Judge "${judges[i].name}" failed: ${errorMessage}`);
        }
      });

      if (scores.length === 0) {
        return {
          score: null,
          label: 'no-scores',
          explanation: 'No judges returned valid scores.',
          metadata: { judgeResults, failedJudges },
        };
      }

      let aggregatedScore: number;
      switch (strategy) {
        case 'mean':
          aggregatedScore = computeMean(scores);
          break;
        case 'median':
          aggregatedScore = computeMedian(scores);
          break;
        case 'majority':
          aggregatedScore = computeMajority(scores);
          break;
        default: {
          const _exhaustive: never = strategy;
          throw new Error(`Unknown aggregation strategy: ${_exhaustive}`);
        }
      }

      const explanation = judgeResults
        .map(({ name, result }) => `${name}: ${result.score ?? 'N/A'}`)
        .join(', ');

      return {
        score: aggregatedScore,
        label: `${strategy}(${scores.length} judges)`,
        explanation: `Aggregated via ${strategy}: ${aggregatedScore.toFixed(
          3
        )}. Individual scores — ${explanation}`,
        metadata: {
          strategy,
          judgeCount: judges.length,
          successfulJudges: scores.length,
          individualScores: scores,
          judgeResults,
          failedJudges,
        },
      };
    },
  };
}
