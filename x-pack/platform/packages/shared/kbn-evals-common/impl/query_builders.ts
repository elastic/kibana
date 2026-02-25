/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface RunFilterOptions {
  suiteId?: string;
  modelId?: string;
}

/**
 * Builds a bool/must query that filters evaluation score documents by run ID
 * with optional suite and task model filters.
 */
export const buildRunFilterQuery = (
  runId: string,
  options?: RunFilterOptions
): { bool: { must: Array<Record<string, unknown>> } } => {
  const must: Array<Record<string, unknown>> = [{ term: { run_id: runId } }];
  if (options?.suiteId) {
    must.push({ term: { 'suite.id': options.suiteId } });
  }
  if (options?.modelId) {
    must.push({ term: { 'task.model.id': options.modelId } });
  }
  return { bool: { must } };
};

/**
 * Returns the aggregation tree for computing per-evaluator, per-dataset statistics
 * (mean, median, std_dev, min, max, count).
 */
export const buildStatsAggregation = () => ({
  by_dataset: {
    terms: { field: 'example.dataset.id', size: 10000 },
    aggs: {
      dataset_name: { terms: { field: 'example.dataset.name', size: 1 } },
      by_evaluator: {
        terms: { field: 'evaluator.name', size: 1000 },
        aggs: {
          score_stats: { extended_stats: { field: 'evaluator.score' } },
          score_median: { percentiles: { field: 'evaluator.score', percents: [50] } },
        },
      },
    },
  },
});

/**
 * Standard sort order for retrieving individual score documents,
 * grouped by dataset, example, evaluator, then repetition.
 */
export const SCORES_SORT_ORDER = [
  { 'example.dataset.name': { order: 'asc' as const } },
  { 'example.index': { order: 'asc' as const } },
  { 'evaluator.name': { order: 'asc' as const } },
  { 'task.repetition_index': { order: 'asc' as const } },
];
