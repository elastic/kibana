/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EvaluatorRegistry, ServerEvaluatorResult } from '../evaluation_engine';

export interface PairwiseEvaluatorResult {
  evaluator: string;
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B' | 'tie';
  direction: 'A_better' | 'B_better' | 'tie';
  delta: number;
}

const computePairwiseResults = (
  evaluatorScores: Record<string, { scoresA: number[]; scoresB: number[] }>
): PairwiseEvaluatorResult[] =>
  Object.entries(evaluatorScores).map(([evaluator, { scoresA, scoresB }]) => {
    const avgA = scoresA.length > 0 ? scoresA.reduce((s, v) => s + v, 0) / scoresA.length : 0;
    const avgB = scoresB.length > 0 ? scoresB.reduce((s, v) => s + v, 0) / scoresB.length : 0;
    const delta = avgA - avgB;
    const isTie = Math.abs(delta) < 0.05;
    const winner: 'A' | 'B' | 'tie' = isTie ? 'tie' : delta > 0 ? 'A' : 'B';
    const direction: 'A_better' | 'B_better' | 'tie' = isTie
      ? 'tie'
      : delta > 0
      ? 'A_better'
      : 'B_better';
    return { evaluator, scoreA: avgA, scoreB: avgB, winner, direction, delta };
  });

const testSignificance = (
  scoresA: number[],
  scoresB: number[]
): {
  significant: boolean;
  pValue?: number;
  confidenceInterval?: { lower: number; upper: number; mean: number; level: number };
  recommendation: string;
} => {
  if (scoresA.length < 5 || scoresB.length < 5) {
    return {
      significant: false,
      recommendation: 'Insufficient data for significance testing (need ≥5 examples per skill)',
    };
  }
  const meanA = scoresA.reduce((s, v) => s + v, 0) / scoresA.length;
  const meanB = scoresB.reduce((s, v) => s + v, 0) / scoresB.length;
  const delta = meanA - meanB;
  const significant = Math.abs(delta) > 0.1;
  return {
    significant,
    recommendation: significant
      ? delta > 0
        ? 'Skill A is significantly better'
        : 'Skill B is significantly better'
      : 'No significant difference detected',
  };
};

const determineWinner = (perEvaluator: PairwiseEvaluatorResult[]): 'A' | 'B' | 'tie' => {
  const wins = perEvaluator.reduce(
    (acc, r) => {
      if (r.winner === 'A') acc.A++;
      else if (r.winner === 'B') acc.B++;
      return acc;
    },
    { A: 0, B: 0 }
  );
  if (wins.A > wins.B) return 'A';
  if (wins.B > wins.A) return 'B';
  return 'tie';
};
import { createEvaluationRunner } from '../evaluation_engine';

export interface PairwiseSkill {
  id: string;
  name: string;
  description: string;
  markdown: string;
}

export interface PairwiseRunConfig {
  skillA: PairwiseSkill;
  skillB: PairwiseSkill;
  examples: Array<{
    input: Record<string, unknown>;
    output?: unknown;
    metadata?: Record<string, unknown>;
  }>;
  evaluatorNames: string[];
  connectorId: string;
  repetitions: number;
}

export interface PairwiseRunResult {
  skill_a_id: string;
  skill_b_id: string;
  per_evaluator: PairwiseEvaluatorResult[];
  aggregate_winner: 'A' | 'B' | 'tie';
  significance: {
    significant: boolean;
    p_value?: number;
    confidence_interval?: { lower: number; upper: number; mean: number; level: number };
    recommendation: string;
  };
  details: {
    total_examples: number;
    total_evaluators: number;
    repetitions: number;
    duration_ms: number;
  };
  timestamp: string;
}

const collectEvaluatorScores = (
  resultsA: Array<{ evaluatorResults: ServerEvaluatorResult[] }>,
  resultsB: Array<{ evaluatorResults: ServerEvaluatorResult[] }>,
  evaluatorNames: string[]
): Record<string, { scoresA: number[]; scoresB: number[] }> => {
  const scores: Record<string, { scoresA: number[]; scoresB: number[] }> = {};

  for (const name of evaluatorNames) {
    scores[name] = { scoresA: [], scoresB: [] };
  }

  for (const result of resultsA) {
    for (const evalResult of result.evaluatorResults) {
      if (evalResult.score != null && scores[evalResult.evaluator]) {
        scores[evalResult.evaluator].scoresA.push(evalResult.score);
      }
    }
  }

  for (const result of resultsB) {
    for (const evalResult of result.evaluatorResults) {
      if (evalResult.score != null && scores[evalResult.evaluator]) {
        scores[evalResult.evaluator].scoresB.push(evalResult.score);
      }
    }
  }

  return scores;
};

export const runPairwiseExperiment = async (
  config: PairwiseRunConfig,
  dependencies: { evaluatorRegistry: EvaluatorRegistry; logger: Logger }
): Promise<PairwiseRunResult> => {
  const { skillA, skillB, examples, evaluatorNames, connectorId, repetitions } = config;
  const { evaluatorRegistry, logger } = dependencies;
  const runner = createEvaluationRunner(evaluatorRegistry, logger);
  const startTime = Date.now();

  const buildItems = (skill: PairwiseSkill) =>
    examples.map((ex) => ({
      input: { ...ex.input, skill_name: skill.name, skill_description: skill.description },
      output: skill.markdown,
      expected: ex.output,
      metadata: ex.metadata,
    }));

  // Run both skills. If one fails, we still return partial results for the other.
  let runA: { results: Array<{ evaluatorResults: ServerEvaluatorResult[] }> } | undefined;
  let runB: { results: Array<{ evaluatorResults: ServerEvaluatorResult[] }> } | undefined;

  try {
    runA = await runner.run({
      items: buildItems(skillA),
      evaluatorNames,
      connectorId,
      concurrency: 3,
    });
  } catch (error) {
    logger.error(`Pairwise: Skill A (${skillA.id}) evaluation failed: ${error}`);
  }

  try {
    runB = await runner.run({
      items: buildItems(skillB),
      evaluatorNames,
      connectorId,
      concurrency: 3,
    });
  } catch (error) {
    logger.error(`Pairwise: Skill B (${skillB.id}) evaluation failed: ${error}`);
  }

  // If both failed, return an empty result
  const emptyResults = { results: [] as Array<{ evaluatorResults: ServerEvaluatorResult[] }> };
  const resultsA = runA ?? emptyResults;
  const resultsB = runB ?? emptyResults;

  // Aggregate per-evaluator scores
  const evaluatorScores = collectEvaluatorScores(
    resultsA.results,
    resultsB.results,
    evaluatorNames
  );

  const perEvaluator = computePairwiseResults(evaluatorScores);

  // Statistical significance on all scores
  const allScoresA = Object.values(evaluatorScores).flatMap((e) => e.scoresA);
  const allScoresB = Object.values(evaluatorScores).flatMap((e) => e.scoresB);
  const sigResult = testSignificance(allScoresA, allScoresB);

  const aggregateWinner = determineWinner(perEvaluator);

  return {
    skill_a_id: skillA.id,
    skill_b_id: skillB.id,
    per_evaluator: perEvaluator,
    aggregate_winner: aggregateWinner,
    significance: {
      significant: sigResult.significant,
      p_value: sigResult.pValue,
      confidence_interval: sigResult.confidenceInterval,
      recommendation: sigResult.recommendation,
    },
    details: {
      total_examples: examples.length,
      total_evaluators: evaluatorNames.length,
      repetitions,
      duration_ms: Date.now() - startTime,
    },
    timestamp: new Date().toISOString(),
  };
};
