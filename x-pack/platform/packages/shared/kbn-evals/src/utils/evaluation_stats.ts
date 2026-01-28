/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mean, median, deviation, min, max } from 'd3';
import type { DatasetEvaluatorStats } from './score_repository';

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
  experimentId: string;
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

export function convertAggregationToDatasetScores(
  aggStats: DatasetEvaluatorStats[]
): DatasetScoreWithStats[] {
  const datasetMap = new Map<string, DatasetScoreWithStats>();

  for (const stat of aggStats) {
    if (!datasetMap.has(stat.datasetId)) {
      datasetMap.set(stat.datasetId, {
        id: stat.datasetId,
        name: stat.datasetName,
        numExamples: stat.numExamples,
        evaluatorScores: new Map(),
        evaluatorStats: new Map(),
        experimentId: '',
      });
    }

    const dataset = datasetMap.get(stat.datasetId)!;
    dataset.evaluatorStats.set(stat.evaluatorName, {
      mean: stat.stats.mean,
      median: stat.stats.median,
      stdDev: stat.stats.stdDev,
      min: stat.stats.min,
      max: stat.stats.max,
      count: stat.stats.count,
      percentage:
        stat.stats.count > 0 ? (stat.stats.mean * stat.stats.count) / stat.numExamples : 0,
    });
  }

  return Array.from(datasetMap.values());
}
