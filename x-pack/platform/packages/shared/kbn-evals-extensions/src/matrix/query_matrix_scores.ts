/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvaluationExperimentSummary } from '@kbn/evals-common';
import { MAX_LIST_EXPERIMENTS, type EvalsClient, type ExperimentStats } from '@kbn/evals';

/** Aggregated evaluator score for a single dataset within a suite. */
export interface AggregatedEvaluatorScore {
  evaluatorName: string;
  mean: number;
  count: number;
  /** Observed spread across the experiment's examples (used by the token axis). */
  min?: number;
  max?: number;
}

export interface AggregatedDatasetScores {
  datasetId: string;
  datasetName: string;
  evaluators: AggregatedEvaluatorScore[];
}

export interface AggregatedSuiteScores {
  suiteId: string;
  experimentId: string;
  timestamp?: string;
  datasets: AggregatedDatasetScores[];
}

export interface AggregatedModelScores {
  modelId: string;
  family?: string;
  provider?: string;
  suites: AggregatedSuiteScores[];
}

export interface QueryMatrixScoresOptions {
  suiteIds: string[];
  /**
   * Task model ids to include (the config's `id` + `matchIds` per model).
   * Each (suite, model) pair is queried separately via the route's `model_id`
   * term filter, so a bounded single-page listing covers the full history for
   * that pair instead of paging an ever-growing cross-model aggregation.
   */
  modelIds: string[];
  branch?: string;
  lookbackDays?: number;
}

/**
 * Selects, per task model, the most recent experiment from a list (typically
 * the newest experiments for one suite + model). Experiments without a model
 * id or timestamp older than the lookback window are ignored. Pure for unit
 * testing.
 */
export const pickLatestExperimentPerModel = (
  experiments: EvaluationExperimentSummary[],
  { lookbackDays, now = Date.now() }: { lookbackDays?: number; now?: number } = {}
): Map<string, EvaluationExperimentSummary> => {
  const cutoff = lookbackDays ? now - lookbackDays * 24 * 60 * 60 * 1000 : undefined;
  const latestByModel = new Map<string, { experiment: EvaluationExperimentSummary; at: number }>();

  for (const experiment of experiments) {
    const modelId = experiment.task_model?.id;
    if (!modelId) {
      continue;
    }

    const at = Date.parse(experiment.timestamp);
    // An unparseable timestamp must not be treated as epoch 0, or stale
    // experiments would silently survive the lookback cutoff.
    if (!Number.isFinite(at) || (cutoff !== undefined && at < cutoff)) {
      continue;
    }

    const existing = latestByModel.get(modelId);
    if (!existing || at > existing.at) {
      latestByModel.set(modelId, { experiment, at });
    }
  }

  return new Map([...latestByModel].map(([modelId, { experiment }]) => [modelId, experiment]));
};

/**
 * Converts the per-experiment stats returned by the evals plugin into the
 * dataset-grouped structure consumed by the matrix builder. Pure for testing.
 */
export const experimentStatsToDatasets = (stats: ExperimentStats): AggregatedDatasetScores[] => {
  const byDataset = new Map<string, AggregatedDatasetScores>();

  for (const stat of stats.stats) {
    let dataset = byDataset.get(stat.datasetId);
    if (!dataset) {
      dataset = { datasetId: stat.datasetId, datasetName: stat.datasetName, evaluators: [] };
      byDataset.set(stat.datasetId, dataset);
    }
    dataset.evaluators.push({
      evaluatorName: stat.evaluatorName,
      mean: stat.stats.mean,
      count: stat.stats.count,
      min: stat.stats.min,
      max: stat.stats.max,
    });
  }

  return [...byDataset.values()];
};

/**
 * Queries the evals plugin for the latest experiment per (model, suite) and
 * returns mean evaluator scores grouped by dataset, ready for `buildMatrix`.
 *
 * Each (suite, model) pair is listed separately through the route's `model_id`
 * term filter: the route answers with a terms aggregation whose bucket size
 * grows with `page * per_page`, so a bounded single page per pair is the only
 * query shape that scales. The newest experiment within the lookback window is
 * then picked client-side (a bare `per_page: 1` request could not express the
 * lookback fallback).
 */
export const queryMatrixScores = async (
  evalsClient: EvalsClient,
  log: SomeDevLog,
  { suiteIds, modelIds, branch, lookbackDays }: QueryMatrixScoresOptions
): Promise<AggregatedModelScores[]> => {
  const byModel = new Map<string, AggregatedModelScores>();

  for (const suiteId of suiteIds) {
    for (const modelId of modelIds) {
      const experiments = await evalsClient.listExperiments({
        suiteId,
        taskModelId: modelId,
        branch,
        limit: MAX_LIST_EXPERIMENTS,
      });
      const [latest] = [...pickLatestExperimentPerModel(experiments, { lookbackDays }).values()];

      log.debug(
        `Suite ${suiteId}, model ${modelId}: ${experiments.length} experiment(s)` +
          (latest ? '' : ', none within the lookback window')
      );

      if (!latest) {
        continue;
      }

      // The experiments listing returns `execution_id` as its grouping key; the
      // detail/stats route must be filtered by execution_id (+ suite + model),
      // since a bare experiment_id path lookup targets a different field and 404s.
      const stats = await evalsClient.getExperimentStats(latest.experiment_id, {
        suiteId,
        taskModelId: modelId,
        executionId: latest.execution_id ?? latest.experiment_id,
      });
      if (!stats) {
        log.warning(
          `No stats for experiment ${latest.experiment_id} (suite ${suiteId}, model ${modelId})`
        );
        continue;
      }

      let model = byModel.get(modelId);
      if (!model) {
        model = {
          modelId,
          family: latest.task_model?.family,
          provider: latest.task_model?.provider,
          suites: [],
        };
        byModel.set(modelId, model);
      }

      model.suites.push({
        suiteId,
        experimentId: latest.experiment_id,
        timestamp: latest.timestamp,
        datasets: experimentStatsToDatasets(stats),
      });
    }
  }

  log.debug(`Matrix query resolved ${byModel.size} model(s) across ${suiteIds.length} suite(s)`);
  return [...byModel.values()];
};
