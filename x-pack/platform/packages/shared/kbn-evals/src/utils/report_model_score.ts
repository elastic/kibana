/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import type { RanExperiment } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { sumBy, keyBy, uniq } from 'lodash';
import { table } from 'table';
import chalk from 'chalk';
import { mean, median, deviation, min, max } from 'd3';
import { hostname } from 'os';
import type { KibanaPhoenixClient } from '../kibana_phoenix_client/client';
import { ScoreExporter } from './score_exporter';

interface DatasetScore {
  id: string;
  name: string;
  numExamples: number;
  evaluatorScores: Map<string, number[]>;
  evaluatorStats?: Map<string, EvaluatorStats>;
}

interface EvaluatorStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export async function reportModelScore({
  log,
  phoenixClient,
  model,
  experiments,
  repetitions,
  esClient,
  runId,
  exportToElasticsearch = true,
}: {
  log: SomeDevLog;
  phoenixClient: KibanaPhoenixClient;
  esClient: EsClient;
  model: Model;
  experiments: RanExperiment[];
  repetitions: number;
  runId?: string;
  exportToElasticsearch?: boolean;
}): Promise<void> {
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
      });
    }

    const datasetScore = datasetScoresMap.get(datasetId)!;
    datasetScore.numExamples += numExamplesForExperiment;

    if (evaluationRuns) {
      evaluationRuns.forEach((evalRun) => {
        const score = evalRun.result?.score ?? 0;

        // If evaluatorScores doesn't contain that evaluator by key, create an empty array
        if (!datasetScore.evaluatorScores.has(evalRun.name)) {
          datasetScore.evaluatorScores.set(evalRun.name, []);
        }
        datasetScore.evaluatorScores.get(evalRun.name)!.push(score);
      });
    }
  }

  // Get all unique evaluator names across all datasets
  const allEvaluatorNames = new Set<string>();
  Array.from(datasetScoresMap.values()).forEach((dataset) => {
    dataset.evaluatorScores.forEach((_, evaluatorName) => {
      allEvaluatorNames.add(evaluatorName);
    });
  });
  const evaluatorNames = Array.from(allEvaluatorNames).sort();

  const datasetScores = Array.from(datasetScoresMap.values()).map((dataset) => ({
    ...dataset,
    evaluatorStats: new Map(
      evaluatorNames.map((evaluatorName) => {
        const scores = dataset.evaluatorScores.get(evaluatorName) || [];
        if (scores.length === 0) {
          return [
            evaluatorName,
            {
              mean: 0,
              median: 0,
              stdDev: 0,
              min: 0,
              max: 0,
              count: 0,
              percentage: 0,
            } as EvaluatorStats,
          ];
        }
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        return [
          evaluatorName,
          {
            mean: mean(scores) ?? 0,
            median: median(scores) ?? 0,
            stdDev: deviation(scores) ?? 0,
            min: min(scores) ?? 0,
            max: max(scores) ?? 0,
            count: scores.length,
            percentage: dataset.numExamples > 0 ? totalScore / dataset.numExamples : 0,
          } as EvaluatorStats,
        ];
      })
    ),
  }));

  if (datasetScores.length === 0) {
    log.error(`No dataset scores were available`);
    return;
  }

  // Calculate overall statistics for each evaluator
  const overallEvaluatorStats = new Map<string, EvaluatorStats>();
  const totalExamples = sumBy(datasetScores, (d) => d.numExamples);

  evaluatorNames.forEach((evaluatorName) => {
    // Get all scores across all datasets for this evaluator
    const allScores = datasetScores.flatMap((d) => d.evaluatorScores.get(evaluatorName) || []);

    if (allScores.length === 0) {
      overallEvaluatorStats.set(evaluatorName, {
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
    const totalScore = sumBy(datasetScores, (d) => {
      const scores = d.evaluatorScores.get(evaluatorName) || [];
      return scores.reduce((sum, score) => sum + score, 0);
    });

    overallEvaluatorStats.set(evaluatorName, {
      mean: mean(allScores) ?? 0,
      median: median(allScores) ?? 0,
      stdDev: deviation(allScores) ?? 0,
      min: min(allScores) ?? 0,
      max: max(allScores) ?? 0,
      count: allScores.length,
      percentage: totalExamples > 0 ? totalScore / totalExamples : 0,
    });
  });

  const header = [`Model: ${model.id} (${model.family}/${model.provider})`];

  // Create summary table with dataset-level and overall descriptive statistics
  const createSummaryTable = () => {
    const repetitionAwareExampleCount = (numExamples: number): string => {
      return repetitions > 1
        ? `${repetitions} x ${numExamples / repetitions}`
        : numExamples.toString();
    };

    const examplesHeader =
      repetitions > 1 ? `# Examples\n${chalk.gray('(repetitions x examples)')}` : '# Examples';

    const tableHeaders = ['Dataset', examplesHeader, ...evaluatorNames];

    const datasetRows = datasetScores.map((dataset) => {
      const row = [dataset.name, repetitionAwareExampleCount(dataset.numExamples)];

      evaluatorNames.forEach((evaluatorName) => {
        const stats = dataset.evaluatorStats.get(evaluatorName);
        if (stats && stats.count > 0) {
          // Combine all statistics in a single cell with multiple lines
          const cellContent = [
            chalk.bold.yellow(`${(stats.percentage * 100).toFixed(1)}%`),
            chalk.cyan(`mean: ${stats.mean.toFixed(3)}`),
            chalk.cyan(`median: ${stats.median.toFixed(3)}`),
            chalk.cyan(`std: ${stats.stdDev.toFixed(3)}`),
            chalk.cyan(`min: ${stats.min.toFixed(3)}`),
            chalk.cyan(`max: ${stats.max.toFixed(3)}`),
          ].join('\n');
          row.push(cellContent);
        } else {
          row.push(chalk.gray('-'));
        }
      });

      return row;
    });

    // Add overall statistics row
    const overallRow = [chalk.bold.green('Overall'), repetitionAwareExampleCount(totalExamples)];
    evaluatorNames.forEach((evaluatorName) => {
      const stats = overallEvaluatorStats.get(evaluatorName);
      if (stats && stats.count > 0) {
        const cellContent = [
          chalk.bold.yellow(`${(stats.percentage * 100).toFixed(1)}%`),
          chalk.bold.green(`mean: ${stats.mean.toFixed(3)}`),
          chalk.bold.green(`median: ${stats.median.toFixed(3)}`),
          chalk.bold.green(`std: ${stats.stdDev.toFixed(3)}`),
          chalk.bold.green(`min: ${stats.min.toFixed(3)}`),
          chalk.bold.green(`max: ${stats.max.toFixed(3)}`),
        ].join('\n');
        overallRow.push(cellContent);
      } else {
        overallRow.push(chalk.bold.green('-'));
      }
    });

    // Build column alignment configuration
    const columnConfig: Record<number, { alignment: 'right' | 'left' }> = {
      0: { alignment: 'left' },
    };
    for (let i = 1; i < tableHeaders.length; i++) {
      columnConfig[i] = { alignment: 'right' };
    }

    return table([tableHeaders, ...datasetRows, overallRow], {
      columns: columnConfig,
    });
  };

  const summaryTable = createSummaryTable();

  log.info(`\n\n${header[0]}`);
  log.info(`\n${chalk.bold.blue('═══ EVALUATION RESULTS ═══')}\n${summaryTable}`);

  if (exportToElasticsearch) {
    try {
      const exporter = new ScoreExporter(esClient, log);
      const currentRunId = runId || process.env.TEST_RUN_ID || `run_${Date.now()}`;

      log.info(chalk.blue('\n═══ EXPORTING TO ELASTICSEARCH ═══'));

      await exporter.exportScores({
        phoenixClient,
        model,
        experiments,
        runId: currentRunId,
        tags: ['evaluation', 'model-score'],
      });

      log.info(chalk.green('✅ Model scores exported to Elasticsearch successfully!'));
      log.info(
        chalk.gray(
          `You can query the data using: environment.hostname:"${hostname()}" AND model.id:"${
            model.id || 'unknown'
          }" AND run_id:"${currentRunId}"`
        )
      );
    } catch (error) {
      log.warning(chalk.yellow('⚠️ Failed to export scores to Elasticsearch:'), error);
    }
  }
}
