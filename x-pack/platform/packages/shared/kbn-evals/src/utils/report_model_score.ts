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
export interface EvaluatorFormatConfig {
  decimalPlaces?: number;
  unitSuffix?: string;
  statsToInclude?: Array<keyof EvaluatorStats>;
}

export interface EvaluatorScoreGroup {
  evaluatorNames: string[];
  combinedColumnName: string;
}

export interface EvaluationTableOptions {
  firstColumnHeader?: string;
  styleRowName?: (name: string) => string;
  statsToInclude?: Array<keyof EvaluatorStats>;
  evaluatorFormats?: Map<string, EvaluatorFormatConfig>;
  evaluatorScoreGroups?: EvaluatorScoreGroup[];
}

/**
 * Returns the default evaluator score groups configuration
 * By default, token evaluators are grouped into a single column
 */
function getDefaultEvaluatorScoreGroups(): EvaluatorScoreGroup[] {
  return [
    {
      evaluatorNames: ['Input Tokens', 'Output Tokens', 'Cached Tokens'],
      combinedColumnName: 'Tokens',
    },
  ];
}

/**
 * Gets default evaluator-specific format configurations
 */
function getDefaultEvaluatorFormats(): Map<string, EvaluatorFormatConfig> {
  return new Map([
    [
      'Input Tokens',
      { decimalPlaces: 1, statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] },
    ],
    [
      'Output Tokens',
      { decimalPlaces: 1, statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] },
    ],
    [
      'Cached Tokens',
      { decimalPlaces: 1, statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] },
    ],
    ['Tool Calls', { decimalPlaces: 1, statsToInclude: ['mean', 'median', 'min', 'max'] }],
    ['Latency', { unitSuffix: 's', statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] }],
  ]);
}

/**
 * Groups evaluator scores based on evaluator score group configurations
 * Returns the new column names and a map of combined column names to their group configs
 */
function groupEvaluatorScores(
  evaluatorNames: string[],
  evaluatorScoreGroups: EvaluatorScoreGroup[]
): {
  columnNames: string[];
  groupMapping: Map<string, EvaluatorScoreGroup>;
} {
  const groupMapping = new Map<string, EvaluatorScoreGroup>();
  const evaluatorsToRemove = new Set<string>();

  for (const group of evaluatorScoreGroups) {
    const hasAllEvaluators = group.evaluatorNames.every((name) => evaluatorNames.includes(name));

    if (hasAllEvaluators) {
      groupMapping.set(group.combinedColumnName, group);
      group.evaluatorNames.forEach((name) => evaluatorsToRemove.add(name));
    }
  }

  const columnNames = evaluatorNames.filter((name) => !evaluatorsToRemove.has(name));

  for (const [combinedName] of groupMapping) {
    columnNames.push(combinedName);
  }

  return { columnNames, groupMapping };
}

/**
 * Creates a formatted table from an EvaluationReport
 * Can be used by any reporter to display results in a consistent format
 */
export function createEvaluationReportTable(
  report: EvaluationReport,
  options: EvaluationTableOptions = {}
): string {
  const {
    firstColumnHeader = 'Dataset',
    styleRowName = (name) => name,
    statsToInclude,
    evaluatorFormats,
    evaluatorScoreGroups = getDefaultEvaluatorScoreGroups(),
  } = options;

  const { datasetScoresWithStats, repetitions } = report;

  const evaluatorNames = getUniqueEvaluatorNames(datasetScoresWithStats);
  const { columnNames, groupMapping } = groupEvaluatorScores(evaluatorNames, evaluatorScoreGroups);
  const overallStats = calculateOverallStats(datasetScoresWithStats);
  const totalExamples = sumBy(datasetScoresWithStats, (d) => d.numExamples);

  const defaultFormats = getDefaultEvaluatorFormats();
  const mergedFormats = new Map([...defaultFormats, ...(evaluatorFormats || [])]);
  const defaultDecimalPlaces = 2;

  const formatExampleCount = (numExamples: number): string => {
    return repetitions > 1
      ? `${repetitions} x ${numExamples / repetitions}`
      : numExamples.toString();
  };

  const examplesHeader = '#';
  const tableHeaders = [firstColumnHeader, examplesHeader, ...columnNames];

  const datasetRows = datasetScoresWithStats.map((dataset) => {
    const row = [styleRowName(dataset.name), formatExampleCount(dataset.numExamples)];

    columnNames.forEach((columnName) => {
      const group = groupMapping.get(columnName);

      if (group) {
        const evaluatorStatsMap = new Map<string, Partial<EvaluatorStats>>();
        group.evaluatorNames.forEach((evaluatorName) => {
          const stats = dataset.evaluatorStats.get(evaluatorName);
          if (stats) {
            evaluatorStatsMap.set(evaluatorName, stats);
          }
        });

        const cellContent = formatEvaluatorScoreGroupCell(
          evaluatorStatsMap,
          group,
          false,
          defaultDecimalPlaces,
          mergedFormats,
          statsToInclude
        );
        row.push(cellContent);
      } else {
        const stats = dataset.evaluatorStats.get(columnName);
        if (stats && stats.count > 0) {
          const cellContent = formatStatsCell(
            stats,
            columnName,
            false,
            defaultDecimalPlaces,
            mergedFormats,
            statsToInclude
          );
          row.push(cellContent);
        } else {
          row.push(chalk.gray('-'));
        }
      }
    });

    return row;
  });

  const overallRow = [
    chalk.bold.green('Overall'),
    chalk.bold.green(formatExampleCount(totalExamples)),
  ];

  columnNames.forEach((columnName) => {
    const group = groupMapping.get(columnName);

    if (group) {
      const evaluatorStatsMap = new Map<string, Partial<EvaluatorStats>>();
      group.evaluatorNames.forEach((evaluatorName) => {
        const stats = overallStats.get(evaluatorName);
        if (stats) {
          evaluatorStatsMap.set(evaluatorName, stats);
        }
      });

      const cellContent = formatEvaluatorScoreGroupCell(
        evaluatorStatsMap,
        group,
        true,
        defaultDecimalPlaces,
        mergedFormats,
        statsToInclude
      );
      overallRow.push(cellContent);
    } else {
      const stats = overallStats.get(columnName);
      if (stats && stats.count > 0) {
        const cellContent = formatStatsCell(
          stats,
          columnName,
          true,
          defaultDecimalPlaces,
          mergedFormats,
          statsToInclude
        );
        overallRow.push(cellContent);
      } else {
        overallRow.push(chalk.bold.green('-'));
      }
    }
  });

  const tableConfig = buildTableConfig(tableHeaders.length);

  return table([tableHeaders, ...datasetRows, overallRow], tableConfig);
}

/**
 * Formats an evaluator score group cell showing multiple evaluators as vertical sections
 */
function formatEvaluatorScoreGroupCell(
  evaluatorStatsMap: Map<string, Partial<EvaluatorStats>>,
  group: EvaluatorScoreGroup,
  isBold: boolean,
  defaultDecimalPlaces: number,
  evaluatorFormats: Map<string, EvaluatorFormatConfig>,
  statsToInclude?: Array<keyof EvaluatorStats>
): string {
  const sections: string[] = [];
  const separator = chalk.gray('────────────────');

  for (const evaluatorName of group.evaluatorNames) {
    const stats = evaluatorStatsMap.get(evaluatorName);
    if (stats && stats.count !== undefined && stats.count > 0) {
      const statsContent = formatStatsCell(
        stats,
        evaluatorName,
        isBold,
        defaultDecimalPlaces,
        evaluatorFormats,
        statsToInclude
      );
      if (statsContent) {
        sections.push(`${chalk.white(evaluatorName)}\n${statsContent}`);
      }
    }
  }

  if (sections.length === 0) {
    return chalk.gray('-');
  }

  return sections.join(`\n${separator}\n`);
}

/**
 * Formats a statistics cell for display in the evaluation table
 */
function formatStatsCell(
  stats: Partial<EvaluatorStats>,
  evaluatorName: string,
  isBold: boolean,
  defaultDecimalPlaces: number,
  evaluatorFormats: Map<string, EvaluatorFormatConfig>,
  statsToInclude?: Array<keyof EvaluatorStats>
): string {
  const colorFn = isBold ? chalk.bold.green : chalk.cyan;
  const percentageColor = isBold ? chalk.bold.yellow : chalk.bold.yellow;

  const lines: string[] = [];

  const evaluatorConfig = evaluatorFormats.get(evaluatorName) || {};
  const decimalPlaces = evaluatorConfig.decimalPlaces ?? defaultDecimalPlaces;
  const unitSuffix = evaluatorConfig.unitSuffix || '';
  const effectiveStatsToInclude = evaluatorConfig.statsToInclude || statsToInclude;

  const labels: Partial<Record<keyof EvaluatorStats, string>> = {
    percentage: 'percentage',
    mean: 'mean',
    median: 'median',
    stdDev: 'std',
    min: 'min',
    max: 'max',
  };

  const formatNumber = (value: number): string => {
    if (Number.isInteger(value)) {
      return value.toFixed(0);
    }
    return value.toFixed(decimalPlaces);
  };

  const shouldInclude = (stat: keyof EvaluatorStats) => {
    return !effectiveStatsToInclude || effectiveStatsToInclude.includes(stat);
  };

  const defaultFormatter = (key: keyof EvaluatorStats, value: number): string => {
    return colorFn(`${labels[key]}: ${formatNumber(value)}${unitSuffix}`);
  };

  const customFormatters: Partial<Record<keyof EvaluatorStats, (value: number) => string>> = {
    percentage: (value) => percentageColor(`${(value * 100).toFixed(1)}%`),
  };

  (Object.keys(labels) as Array<keyof EvaluatorStats>).forEach((key) => {
    if (shouldInclude(key) && stats[key] !== undefined) {
      const formatter = customFormatters[key] || ((value: number) => defaultFormatter(key, value));
      lines.push(formatter(stats[key] as number));
    }
  });

  return lines.join('\n');
}

function buildTableConfig(columnCount: number): {
  columns: Record<number, { alignment: 'right' | 'left' }>;
} {
  const columns: Record<number, { alignment: 'right' | 'left' }> = {
    0: { alignment: 'left' },
  };

  for (let i = 1; i < columnCount; i++) {
    columns[i] = { alignment: 'right' };
  }

  return { columns };
}
