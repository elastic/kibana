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
import {
  EvaluationScoreRepository,
  type EvaluationScoreDocument,
  parseScoreDocuments,
} from './score_repository';
import {
  buildEvaluationResults,
  calculateEvaluatorStats,
  getUniqueEvaluatorNames,
  calculateOverallStats,
  type DatasetScoreWithStats,
  type EvaluatorStats,
} from './evaluation_stats';

/**
 * Evaluation report containing dataset scores with computed statistics
 * Ready for export to Elasticsearch and display via reporters
 */
export interface EvaluationReport {
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
 * Builds an evaluation report from Phoenix experiments
 * Aggregates raw experiment data and computes statistics for each dataset and evaluator
 */
export async function buildEvaluationReport({
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
}): Promise<EvaluationReport> {
  const { datasetScores } = await buildEvaluationResults(experiments, phoenixClient);

  // Add evaluator stats to dataset scores
  const datasetScoresWithStats: DatasetScoreWithStats[] = datasetScores.map((dataset) => ({
    ...dataset,
    evaluatorStats: new Map(
      Array.from(dataset.evaluatorScores.entries()).map(([evaluatorName, scores]) => {
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
 * Exports evaluation results to an Elasticsearch datastream
 * This ensures results are persisted for analysis and comparison
 */
export async function exportEvaluations(
  report: EvaluationReport,
  esClient: EsClient,
  log: SomeDevLog
): Promise<void> {
  if (report.datasetScoresWithStats.length === 0) {
    log.warning('No dataset scores available to export to Elasticsearch');
    return;
  }

  log.info(chalk.blue('\n═══ EXPORTING TO ELASTICSEARCH ═══'));

  const exporter = new EvaluationScoreRepository(esClient, log);

  await exporter.exportScores({
    datasetScoresWithStats: report.datasetScoresWithStats,
    model: report.model,
    evaluatorModel: report.evaluatorModel,
    runId: report.runId,
    repetitions: report.repetitions,
  });

  log.info(chalk.green('✅ Model scores exported to Elasticsearch successfully!'));
  log.info(
    chalk.gray(
      `You can query the data using: environment.hostname:"${hostname()}" AND model.id:"${
        report.model.id || 'unknown'
      }" AND run_id:"${report.runId}"`
    )
  );
}

/**
 * Formats Elasticsearch documents into structured report data
 */
export function formatReportData(scores: EvaluationScoreDocument[]): EvaluationReport {
  if (scores.length === 0) {
    throw new Error('No documents to format');
  }

  const scoresWithStats = parseScoreDocuments(scores);

  // Assumes all evaluation datasets are repeated the same number of times
  const repetitions = scores[0].repetitions ?? 1;

  return {
    datasetScoresWithStats: scoresWithStats,
    model: scores[0].model as Model,
    evaluatorModel: scores[0].evaluator_model as Model,
    repetitions,
    runId: scores[0].run_id,
  };
}

/**
 * Default terminal reporter implementation
 * Displays evaluation results as a formatted table in the terminal
 */
export function createDefaultTerminalReporter(): EvaluationReporter {
  return async (scoreRepository: EvaluationScoreRepository, runId: string, log: SomeDevLog) => {
    const docs = await scoreRepository.getScoresByRunId(runId);

    if (docs.length === 0) {
      log.error(`No evaluation results found for run ID: ${runId}`);
      return;
    }

    const report = formatReportData(docs);

    const header = buildReportHeader(report.model, report.evaluatorModel);
    const summaryTable = createEvaluationReportTable(report);

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

export interface EvaluationTableOptions {
  firstColumnHeader?: string;
  styleRowName?: (name: string) => string;
  statsToInclude?: Array<keyof EvaluatorStats>;
}

/**
 * Creates a formatted table from an EvaluationReport
 * Can be used by any reporter to display results in a consistent format
 */
export function createEvaluationReportTable(
  report: EvaluationReport,
  options: EvaluationTableOptions = {}
): string {
  const { firstColumnHeader = 'Dataset', styleRowName = (name) => name, statsToInclude } = options;

  const { datasetScoresWithStats, repetitions } = report;

  const evaluatorNames = getUniqueEvaluatorNames(datasetScoresWithStats);
  const overallStats = calculateOverallStats(datasetScoresWithStats);
  const totalExamples = sumBy(datasetScoresWithStats, (d) => d.numExamples);

  const formatExampleCount = (numExamples: number): string => {
    return repetitions > 1
      ? `${repetitions} x ${numExamples / repetitions}`
      : numExamples.toString();
  };

  const examplesHeader =
    repetitions > 1 ? `# Examples\n${chalk.gray('(repetitions x examples)')}` : '# Examples';

  const tableHeaders = [firstColumnHeader, examplesHeader, ...evaluatorNames];

  const datasetRows = datasetScoresWithStats.map((dataset) => {
    const row = [styleRowName(dataset.name), formatExampleCount(dataset.numExamples)];

    evaluatorNames.forEach((evaluatorName) => {
      const stats = dataset.evaluatorStats.get(evaluatorName);
      if (stats && stats.count > 0) {
        const cellContent = formatStatsCell(stats, false, statsToInclude);
        row.push(cellContent);
      } else {
        row.push(chalk.gray('-'));
      }
    });

    return row;
  });

  const overallRow = [
    chalk.bold.green('Overall'),
    chalk.bold.green(formatExampleCount(totalExamples)),
  ];

  evaluatorNames.forEach((evaluatorName) => {
    const stats = overallStats.get(evaluatorName);
    if (stats && stats.count > 0) {
      const cellContent = formatStatsCell(stats, true, statsToInclude);
      overallRow.push(cellContent);
    } else {
      overallRow.push(chalk.bold.green('-'));
    }
  });

  const columnConfig = buildColumnAlignment(tableHeaders.length);

  return table([tableHeaders, ...datasetRows, overallRow], { columns: columnConfig });
}

/**
 * Formats a statistics cell for display in the evaluation table
 */
function formatStatsCell(
  stats: Partial<EvaluatorStats>,
  isBold: boolean,
  statsToInclude?: Array<keyof EvaluatorStats>
): string {
  const colorFn = isBold ? chalk.bold.green : chalk.cyan;
  const percentageColor = isBold ? chalk.bold.yellow : chalk.bold.yellow;

  const lines: string[] = [];

  const shouldInclude = (stat: keyof EvaluatorStats) => {
    return !statsToInclude || statsToInclude.includes(stat);
  };

  if (shouldInclude('percentage') && stats.percentage !== undefined) {
    lines.push(percentageColor(`${(stats.percentage * 100).toFixed(1)}%`));
  }

  if (shouldInclude('mean') && stats.mean !== undefined) {
    lines.push(colorFn(`mean: ${stats.mean.toFixed(3)}`));
  }

  if (shouldInclude('median') && stats.median !== undefined) {
    lines.push(colorFn(`median: ${stats.median.toFixed(3)}`));
  }

  if (shouldInclude('stdDev') && stats.stdDev !== undefined) {
    lines.push(colorFn(`std: ${stats.stdDev.toFixed(3)}`));
  }

  if (shouldInclude('min') && stats.min !== undefined) {
    lines.push(colorFn(`min: ${stats.min.toFixed(3)}`));
  }

  if (shouldInclude('max') && stats.max !== undefined) {
    lines.push(colorFn(`max: ${stats.max.toFixed(3)}`));
  }

  return lines.join('\n');
}

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
