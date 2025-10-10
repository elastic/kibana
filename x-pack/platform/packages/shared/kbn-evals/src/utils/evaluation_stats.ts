/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RanExperiment } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import { keyBy, uniq } from 'lodash';
import { mean, median, deviation, min, max } from 'd3';
import type { KibanaPhoenixClient } from '../kibana_phoenix_client/client';

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
  experiments: Array<{ id?: string }>;
}

export interface DatasetScoreWithStats extends DatasetScore {
  evaluatorStats: Map<string, EvaluatorStats>;
}

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
 * Process experiments into dataset scores with aggregated evaluator scores
 */
export async function processExperimentsToDatasetScores(
  experiments: RanExperiment[],
  phoenixClient: KibanaPhoenixClient
): Promise<DatasetScore[]> {
  const allDatasetIds = uniq(experiments.flatMap((experiment) => experiment.datasetId));
  const datasetInfos = await phoenixClient.getDatasets(allDatasetIds);
  const datasetInfosById = keyBy(datasetInfos, (datasetInfo) => datasetInfo.id);

  const datasetScoresMap = new Map<string, DatasetScore>();

  for (const experiment of experiments) {
    const { datasetId, evaluationRuns, runs } = experiment;
    const numExamplesForExperiment = runs ? Object.keys(runs).length : 0;

    if (!datasetScoresMap.has(datasetId)) {
      datasetScoresMap.set(datasetId, {
        id: datasetId,
        name: datasetInfosById[datasetId]?.name ?? datasetId,
        numExamples: 0,
        evaluatorScores: new Map<string, number[]>(),
        experiments: [],
      });
    }

    const datasetScore = datasetScoresMap.get(datasetId)!;
    datasetScore.numExamples += numExamplesForExperiment;

    datasetScore.experiments.push({ id: experiment.id });

    if (evaluationRuns) {
      evaluationRuns.forEach((evalRun) => {
        const score = evalRun.result?.score ?? 0;
        if (!datasetScore.evaluatorScores.has(evalRun.name)) {
          datasetScore.evaluatorScores.set(evalRun.name, []);
        }
        datasetScore.evaluatorScores.get(evalRun.name)!.push(score);
      });
    }
  }

  return Array.from(datasetScoresMap.values());
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
export function calculateOverallStats(
  datasetScores: DatasetScore[],
  evaluatorNames: string[]
): Map<string, EvaluatorStats> {
  const overallStats = new Map<string, EvaluatorStats>();
  const totalExamples = datasetScores.reduce((sum, d) => sum + d.numExamples, 0);

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
export async function buildEvaluationResults(
  experiments: RanExperiment[],
  phoenixClient: KibanaPhoenixClient
): Promise<{
  datasetScores: DatasetScore[];
  evaluatorNames: string[];
  overallStats: Map<string, EvaluatorStats>;
}> {
  const datasetScores = await processExperimentsToDatasetScores(experiments, phoenixClient);
  const evaluatorNames = getUniqueEvaluatorNames(datasetScores);
  const overallStats = calculateOverallStats(datasetScores, evaluatorNames);

  return { datasetScores, evaluatorNames, overallStats };
}
