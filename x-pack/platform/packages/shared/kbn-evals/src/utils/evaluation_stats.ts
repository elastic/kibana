/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mean, median, deviation, min, max } from 'd3';
import type { RanExperiment, EvaluationResult } from '../types';
import type { EvaluationExplanation } from './score_repository';

export interface EvaluatorStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface DatasetScore {
  id: string;
  name: string;
  numExamples: number;
  evaluatorScores: Map<string, number[]>;
  /** Explanations for evaluations with scores below 1.0 */
  evaluatorExplanations: Map<string, EvaluationExplanation[]>;
  experimentId: string;
}

export interface DatasetScoreWithStats extends DatasetScore {
  evaluatorStats: Map<string, EvaluatorStats>;
}

/**
 * Score threshold below which we capture explanations for display
 */
const LOW_SCORE_THRESHOLD = 1.0;

/**
 * Calculate descriptive statistics for a set of scores
 */
export function calculateEvaluatorStats(scores: number[], totalExamples: number): EvaluatorStats {
  if (scores.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      count: 0,
      percentage: 0,
    };
  }

  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  return {
    mean: mean(scores) ?? 0,
    median: median(scores) ?? 0,
    stdDev: deviation(scores) ?? 0,
    min: min(scores) ?? 0,
    max: max(scores) ?? 0,
    count: scores.length,
    percentage: totalExamples > 0 ? totalScore / totalExamples : 0,
  };
}

/**
 * Extract input question from example input
 */
function extractInputQuestion(input: Record<string, unknown>): string | undefined {
  // Try common input field names
  if (typeof input.question === 'string') return input.question;
  if (typeof input.query === 'string') return input.query;
  if (typeof input.prompt === 'string') return input.prompt;
  if (typeof input.message === 'string') return input.message;
  if (typeof input.text === 'string') return input.text;
  // Fallback to JSON stringified (truncated)
  const json = JSON.stringify(input);
  return json.length > 200 ? json.slice(0, 200) + '...' : json;
}

/**
 * Process experiments into dataset scores with aggregated evaluator scores
 */
export async function processExperimentsToDatasetScores(
  experiments: RanExperiment[]
): Promise<DatasetScore[]> {
  return experiments.map((experiment) => {
    const { datasetId, datasetName, evaluationRuns, runs, id } = experiment;
    const numExamples = runs ? Object.keys(runs).length : 0;

    const evaluatorScores = new Map<string, number[]>();
    const evaluatorExplanations = new Map<string, EvaluationExplanation[]>();

    if (evaluationRuns) {
      evaluationRuns.forEach((evalRun) => {
        const score = evalRun.result?.score ?? 0;
        if (!evaluatorScores.has(evalRun.name)) {
          evaluatorScores.set(evalRun.name, []);
        }
        evaluatorScores.get(evalRun.name)!.push(score);

        // Capture explanations for scores below threshold
        if (score < LOW_SCORE_THRESHOLD && evalRun.result) {
          if (!evaluatorExplanations.has(evalRun.name)) {
            evaluatorExplanations.set(evalRun.name, []);
          }

          // Get input question from the run data
          const runKey = evalRun.runKey;
          const runData = runKey && runs ? runs[runKey] : null;
          const inputQuestion = runData?.input
            ? extractInputQuestion(runData.input as Record<string, unknown>)
            : undefined;

          evaluatorExplanations.get(evalRun.name)!.push({
            exampleIndex: evalRun.exampleIndex ?? 0,
            repetition: evalRun.repetition ?? 0,
            score: evalRun.result.score ?? null,
            label: evalRun.result.label,
            explanation: evalRun.result.explanation,
            reasoning: evalRun.result.reasoning,
            inputQuestion,
          });
        }
      });
    }

    return {
      id: datasetId,
      name: datasetName ?? datasetId,
      numExamples,
      evaluatorScores,
      evaluatorExplanations,
      experimentId: id ?? '',
    };
  });
}

/**
 * Extract unique evaluator names from dataset scores
 */
export function getUniqueEvaluatorNames(datasetScores: DatasetScore[]): string[] {
  const allEvaluatorNames = new Set<string>();
  datasetScores.forEach((dataset) => {
    dataset.evaluatorScores.forEach((_, evaluatorName) => {
      allEvaluatorNames.add(evaluatorName);
    });
  });
  return Array.from(allEvaluatorNames).sort();
}

/**
 * Calculate overall statistics across all datasets for each evaluator
 */
export function calculateOverallStats(datasetScores: DatasetScore[]): Map<string, EvaluatorStats> {
  const overallStats = new Map<string, EvaluatorStats>();
  const totalExamples = datasetScores.reduce((sum, d) => sum + d.numExamples, 0);

  const evaluatorNames = getUniqueEvaluatorNames(datasetScores);

  evaluatorNames.forEach((evaluatorName) => {
    // Get all scores across all datasets for this evaluator
    const allScores = datasetScores.flatMap((d) => d.evaluatorScores.get(evaluatorName) || []);

    if (allScores.length === 0) {
      overallStats.set(evaluatorName, {
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        count: 0,
        percentage: 0,
      });
      return;
    }

    // Calculate weighted percentage (total score across all datasets / total examples)
    const totalScore = datasetScores.reduce((sum, d) => {
      const scores = d.evaluatorScores.get(evaluatorName) || [];
      return sum + scores.reduce((scoreSum, score) => scoreSum + score, 0);
    }, 0);

    overallStats.set(evaluatorName, {
      mean: mean(allScores) ?? 0,
      median: median(allScores) ?? 0,
      stdDev: deviation(allScores) ?? 0,
      min: min(allScores) ?? 0,
      max: max(allScores) ?? 0,
      count: allScores.length,
      percentage: totalExamples > 0 ? totalScore / totalExamples : 0,
    });
  });

  return overallStats;
}

/**
 * Complete evaluation results processing - composition function for common workflow
 */
export async function buildEvaluationResults(experiments: RanExperiment[]): Promise<{
  datasetScores: DatasetScore[];
  overallStats: Map<string, EvaluatorStats>;
}> {
  const datasetScores = await processExperimentsToDatasetScores(experiments);
  const overallStats = calculateOverallStats(datasetScores);

  return { datasetScores, overallStats };
}
