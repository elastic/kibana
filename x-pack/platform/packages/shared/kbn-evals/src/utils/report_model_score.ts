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
import { EvaluationScoreRepository, type ModelScoreDocument } from './score_repository';
import {
  buildEvaluationResults,
  calculateEvaluatorStats,
  getUniqueEvaluatorNames,
  calculateOverallStats,
  type DatasetScoreWithStats,
  type EvaluatorStats,
} from './evaluation_stats';

/**
 * Prepared evaluation data ready for export and reporting
 */
export interface PreparedEvaluationData {
  datasetScoresWithStats: DatasetScoreWithStats[];
  model: Model;
  evaluatorModel: Model;
  repetitions: number;
  runId: string;
}

/**
 * Function signature for evaluation reporters
 * Reporters provide evaluation results to users (e.g., terminal, file, dashboard)
 */
export type EvaluationReporter = (
  scoreRepository: EvaluationScoreRepository,
  runId: string,
  log: SomeDevLog
) => Promise<void>;

/**
 * Prepares evaluation data from Phoenix experiments
 * This function aggregates raw experiment data and computes statistics
 */
export async function prepareEvaluationData({
  phoenixClient,
  experiments,
  model,
  evaluatorModel,
  repetitions,
  runId,
}: {
  phoenixClient: KibanaPhoenixClient;
  experiments: RanExperiment[];
  model: Model;
  evaluatorModel: Model;
  repetitions: number;
  runId?: string;
}): Promise<PreparedEvaluationData> {
  const { datasetScores, evaluatorNames } = await buildEvaluationResults(
    experiments,
    phoenixClient
  );

  // Add evaluator stats to dataset scores
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

  const currentRunId = runId || process.env.TEST_RUN_ID;

  return {
    datasetScoresWithStats,
    model,
    evaluatorModel,
    repetitions,
    runId: currentRunId!,
  };
}

/**
 * Exports evaluation results to Elasticsearch datastream
 * This ensures results are persisted for analysis and comparison
 */
export async function exportEvaluationToElasticsearch(
  data: PreparedEvaluationData,
  esClient: EsClient,
  log: SomeDevLog
): Promise<void> {
  if (data.datasetScoresWithStats.length === 0) {
    log.warning('No dataset scores available to export to Elasticsearch');
    return;
  }

  log.info(chalk.blue('\n═══ EXPORTING TO ELASTICSEARCH ═══'));

  // Derive evaluator names from the dataset scores
  const evaluatorNames = getUniqueEvaluatorNames(data.datasetScoresWithStats);

  const exporter = new EvaluationScoreRepository(esClient, log);

  await exporter.exportScores({
    datasetScoresWithStats: data.datasetScoresWithStats,
    evaluatorNames,
    model: data.model,
    evaluatorModel: data.evaluatorModel,
    runId: data.runId,
    tags: ['evaluation', 'model-score'],
  });

  log.info(chalk.green('✅ Model scores exported to Elasticsearch successfully!'));
  log.info(
    chalk.gray(
      `You can query the data using: environment.hostname:"${hostname()}" AND model.id:"${
        data.model.id || 'unknown'
      }" AND run_id:"${data.runId}"`
    )
  );
}

/**
 * Formats Elasticsearch documents into structured report data
 * This helper reconstructs the data structure needed for the default terminal reporter
 */
function formatReportData(docs: ModelScoreDocument[]): PreparedEvaluationData {
  if (docs.length === 0) {
    throw new Error('No documents to format');
  }

  // Group documents by dataset
  const datasetMap = new Map<string, DatasetScoreWithStats>();

  for (const doc of docs) {
    if (!datasetMap.has(doc.dataset.id)) {
      datasetMap.set(doc.dataset.id, {
        id: doc.dataset.id,
        name: doc.dataset.name,
        numExamples: doc.dataset.examples_count,
        evaluatorScores: new Map(),
        evaluatorStats: new Map(),
        experimentId: doc.experiment_id,
      });
    }

    const dataset = datasetMap.get(doc.dataset.id)!;

    // Add evaluator scores and stats
    dataset.evaluatorScores.set(doc.evaluator.name, doc.evaluator.scores);
    dataset.evaluatorStats.set(doc.evaluator.name, {
      mean: doc.evaluator.stats.mean,
      median: doc.evaluator.stats.median,
      stdDev: doc.evaluator.stats.std_dev,
      min: doc.evaluator.stats.min,
      max: doc.evaluator.stats.max,
      count: doc.evaluator.stats.count,
      percentage: doc.evaluator.stats.percentage,
    });
  }

  // Repetitions could be inferred from data if needed, default to 1
  const repetitions = 1;

  return {
    datasetScoresWithStats: Array.from(datasetMap.values()),
    model: docs[0].model as Model,
    evaluatorModel: docs[0].evaluatorModel as Model,
    repetitions,
    runId: docs[0].run_id,
  };
}

/**
 * Default terminal reporter implementation
 * Displays evaluation results as a formatted table in the terminal
 * Queries Elasticsearch for the specified run and formats the results
 */
export function createDefaultTerminalReporter(): EvaluationReporter {
  return async (scoreRepository: EvaluationScoreRepository, runId: string, log: SomeDevLog) => {
    // Query ES for this run's results
    const docs = await scoreRepository.getScoresByRunId(runId);

    if (docs.length === 0) {
      log.error(`No evaluation results found for run ID: ${runId}`);
      return;
    }

    // Format ES documents into structured data
    const data = formatReportData(docs);

    // Build and display the report
    const header = buildReportHeader(data.model, data.evaluatorModel);
    const summaryTable = createSummaryTable(data);

    log.info(`\n\n${header.join('\n')}`);
    log.info(`\n${chalk.bold.blue('═══ EVALUATION RESULTS ═══')}\n${summaryTable}`);
  };
}

/**
 * Builds the report header with model information
 */
function buildReportHeader(model: Model, evaluatorModel: Model): string[] {
  return [
    `Model: ${model.id} (${model.family}/${model.provider})`,
    `Evaluator Model: ${evaluatorModel.id} (${evaluatorModel.family}/${evaluatorModel.provider})`,
  ];
}

/**
 * Creates a formatted summary table with dataset-level and overall statistics
 */
function createSummaryTable(data: PreparedEvaluationData): string {
  const { datasetScoresWithStats, repetitions } = data;

  // Derive evaluator names and overall stats on demand
  const evaluatorNames = getUniqueEvaluatorNames(datasetScoresWithStats);
  const overallStats = calculateOverallStats(datasetScoresWithStats, evaluatorNames);

  const totalExamples = sumBy(datasetScoresWithStats, (d) => d.numExamples);

  const formatExampleCount = (numExamples: number): string => {
    return repetitions > 1
      ? `${repetitions} x ${numExamples / repetitions}`
      : numExamples.toString();
  };

  const examplesHeader =
    repetitions > 1 ? `# Examples\n${chalk.gray('(repetitions x examples)')}` : '# Examples';

  const tableHeaders = ['Dataset', examplesHeader, ...evaluatorNames];

  const datasetRows = datasetScoresWithStats.map((dataset) =>
    createDatasetRow(dataset, evaluatorNames, formatExampleCount(dataset.numExamples))
  );

  const overallRow = createOverallRow(
    evaluatorNames,
    overallStats,
    formatExampleCount(totalExamples)
  );

  const columnConfig = buildColumnAlignment(tableHeaders.length);

  return table([tableHeaders, ...datasetRows, overallRow], { columns: columnConfig });
}

/**
 * Creates a table row for a single dataset
 */
function createDatasetRow(
  dataset: DatasetScoreWithStats,
  evaluatorNames: string[],
  exampleCount: string
): string[] {
  const row = [dataset.name, exampleCount];

  evaluatorNames.forEach((evaluatorName) => {
    const stats = dataset.evaluatorStats.get(evaluatorName);
    row.push(stats && stats.count > 0 ? formatStatsCell(stats, false) : chalk.gray('-'));
  });

  return row;
}

/**
 * Creates the overall statistics row
 */
function createOverallRow(
  evaluatorNames: string[],
  overallStats: Map<string, EvaluatorStats>,
  exampleCount: string
): string[] {
  const row = [chalk.bold.green('Overall'), exampleCount];

  evaluatorNames.forEach((evaluatorName) => {
    const stats = overallStats.get(evaluatorName);
    row.push(stats && stats.count > 0 ? formatStatsCell(stats, true) : chalk.bold.green('-'));
  });

  return row;
}

/**
 * Formats statistics into a colored cell content
 */
function formatStatsCell(stats: EvaluatorStats, isBold: boolean): string {
  const colorFn = isBold ? chalk.bold.green : chalk.cyan;
  const percentageColor = isBold ? chalk.bold.yellow : chalk.bold.yellow;

  return [
    percentageColor(`${(stats.percentage * 100).toFixed(1)}%`),
    colorFn(`mean: ${stats.mean.toFixed(3)}`),
    colorFn(`median: ${stats.median.toFixed(3)}`),
    colorFn(`std: ${stats.stdDev.toFixed(3)}`),
    colorFn(`min: ${stats.min.toFixed(3)}`),
    colorFn(`max: ${stats.max.toFixed(3)}`),
  ].join('\n');
}

/**
 * Builds column alignment configuration for the table
 */
function buildColumnAlignment(
  columnCount: number
): Record<number, { alignment: 'right' | 'left' }> {
  const config: Record<number, { alignment: 'right' | 'left' }> = {
    0: { alignment: 'left' },
  };

  for (let i = 1; i < columnCount; i++) {
    config[i] = { alignment: 'right' };
  }

  return config;
}
