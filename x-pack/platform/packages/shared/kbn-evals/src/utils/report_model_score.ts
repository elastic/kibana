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
import { sumBy } from 'lodash';
import { table } from 'table';
import chalk from 'chalk';
import { hostname } from 'os';
import type { KibanaPhoenixClient } from '../kibana_phoenix_client/client';
import { EvaluationScoreRepository } from './score_repository';
import {
  buildEvaluationResults,
  calculateEvaluatorStats,
  type DatasetScoreWithStats,
} from './evaluation_stats';

export async function reportModelScore({
  log,
  phoenixClient,
  model,
  experiments,
  repetitions,
  esClient,
  runId,
}: {
  log: SomeDevLog;
  phoenixClient: KibanaPhoenixClient;
  esClient: EsClient;
  model: Model;
  experiments: RanExperiment[];
  repetitions: number;
  runId?: string;
}): Promise<void> {
  const { datasetScores, evaluatorNames, overallStats } = await buildEvaluationResults(
    experiments,
    phoenixClient
  );

  // Add evaluator stats to dataset scores for table formatting
  const datasetScoresWithStats: DatasetScoreWithStats[] = datasetScores.map((dataset) => ({
    ...dataset,
    evaluatorStats: new Map(
      evaluatorNames.map((evaluatorName) => {
        const scores = dataset.evaluatorScores.get(evaluatorName) || [];
        const stats = calculateEvaluatorStats(scores, dataset.numExamples);
        return [evaluatorName, stats];
      })
    ),
  }));

  if (datasetScores.length === 0) {
    log.error(`No dataset scores were available`);
    return;
  }

  const totalExamples = sumBy(datasetScores, (d) => d.numExamples);
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

    const datasetRows = datasetScoresWithStats.map((dataset) => {
      const row = [dataset.name, repetitionAwareExampleCount(dataset.numExamples)];

      evaluatorNames.forEach((evaluatorName) => {
        const stats = dataset.evaluatorStats!.get(evaluatorName);
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
      const stats = overallStats.get(evaluatorName);
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

  // Export to Elasticsearch
  try {
    const exporter = new EvaluationScoreRepository(esClient, log);
    const currentRunId = runId || process.env.TEST_RUN_ID || `run_${Date.now()}`;

    log.info(chalk.blue('\n═══ EXPORTING TO ELASTICSEARCH ═══'));

    await exporter.exportScores({
      datasetScoresWithStats,
      evaluatorNames,
      model,
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
