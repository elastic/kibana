/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sumBy } from 'lodash';
import { table } from 'table';
import chalk from 'chalk';
import type { EvaluatorStats, DatasetScoreWithStats } from '../evaluation_stats';
import { getUniqueEvaluatorNames, calculateOverallStats } from '../evaluation_stats';

export interface EvaluatorDisplayOptions {
  decimalPlaces?: number;
  unitSuffix?: string;
  statsToInclude?: Array<keyof EvaluatorStats>;
}

export interface EvaluatorDisplayGroup {
  evaluatorNames: string[];
  combinedColumnName: string;
}

export interface EvaluationTableOptions {
  firstColumnHeader?: string;
  styleRowName?: (name: string) => string;
  evaluatorDisplayOptions?: Map<string, EvaluatorDisplayOptions>;
  evaluatorDisplayGroups?: EvaluatorDisplayGroup[];
}

function groupEvaluatorScores(
  evaluatorNames: string[],
  evaluatorScoreGroups: EvaluatorDisplayGroup[]
): {
  columnNames: string[];
  groupMapping: Map<string, EvaluatorDisplayGroup>;
} {
  const groupMapping = new Map<string, EvaluatorDisplayGroup>();
  const grouped = new Set<string>();

  evaluatorScoreGroups.forEach((group) => {
    if (group.evaluatorNames.every((name) => evaluatorNames.includes(name))) {
      groupMapping.set(group.combinedColumnName, group);
      group.evaluatorNames.forEach((name) => grouped.add(name));
    }
  });

  return {
    columnNames: [...evaluatorNames.filter((name) => !grouped.has(name)), ...groupMapping.keys()],
    groupMapping,
  };
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

function formatStatsCell(
  stats: Partial<EvaluatorStats>,
  evaluatorName: string,
  isBold: boolean,
  evaluatorFormats: Map<string, EvaluatorDisplayOptions>
): string {
  const colorFn = isBold ? chalk.bold.green : chalk.cyan;
  const percentageColor = chalk.bold.yellow;

  const evaluatorConfig = evaluatorFormats.get(evaluatorName) || {};
  const decimalPlaces = evaluatorConfig.decimalPlaces ?? 2;
  const unitSuffix = evaluatorConfig.unitSuffix || '';
  const statsToInclude = evaluatorConfig.statsToInclude;

  const statLabels: Array<[keyof EvaluatorStats, string]> = [
    ['percentage', 'percentage'],
    ['mean', 'mean'],
    ['median', 'median'],
    ['stdDev', 'std'],
    ['min', 'min'],
    ['max', 'max'],
  ];

  return statLabels
    .filter(
      ([key]) => stats[key] !== undefined && (!statsToInclude || statsToInclude.includes(key))
    )
    .map(([key, label]) => {
      const value = stats[key] as number;
      if (key === 'percentage') {
        return percentageColor(`${(value * 100).toFixed(1)}%`);
      }
      const formatted = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(decimalPlaces);
      return colorFn(`${label}: ${formatted}${unitSuffix}`);
    })
    .join('\n');
}

function formatEvaluatorScoreGroupCell(
  evaluatorStatsMap: Map<string, Partial<EvaluatorStats>>,
  group: EvaluatorDisplayGroup,
  isBold: boolean,
  evaluatorFormats: Map<string, EvaluatorDisplayOptions>
): string {
  const sections = group.evaluatorNames
    .map((evaluatorName) => {
      const stats = evaluatorStatsMap.get(evaluatorName);
      if (!stats || !stats.count || stats.count === 0) return null;
      const statsContent = formatStatsCell(stats, evaluatorName, isBold, evaluatorFormats);
      return statsContent ? `${chalk.white(evaluatorName)}\n${statsContent}` : null;
    })
    .filter((section): section is string => section !== null);

  return sections.length === 0
    ? chalk.gray('-')
    : sections.join(`\n${chalk.gray('────────────────')}\n`);
}

function formatRowCells(
  evaluatorStats: Map<string, Partial<EvaluatorStats>>,
  columnNames: string[],
  groupMapping: Map<string, EvaluatorDisplayGroup>,
  isBold: boolean,
  evaluatorFormats: Map<string, EvaluatorDisplayOptions>
): string[] {
  return columnNames.map((columnName) => {
    const group = groupMapping.get(columnName);
    if (group) {
      const evaluatorStatsToGroup = new Map<string, Partial<EvaluatorStats>>(
        group.evaluatorNames
          .map((name) => [name, evaluatorStats.get(name)] as const)
          .filter((entry): entry is [string, Partial<EvaluatorStats>] => entry[1] !== undefined)
      );
      return formatEvaluatorScoreGroupCell(evaluatorStatsToGroup, group, isBold, evaluatorFormats);
    }

    const stats = evaluatorStats.get(columnName);
    if (stats && stats.count !== undefined && stats.count > 0) {
      return formatStatsCell(stats, columnName, isBold, evaluatorFormats);
    }
    return isBold ? chalk.bold.green('-') : chalk.gray('-');
  });
}

export function createTable(
  datasetScoresWithStats: DatasetScoreWithStats[],
  repetitions: number,
  options: EvaluationTableOptions = {}
): string {
  const {
    firstColumnHeader = 'Dataset',
    styleRowName = (name) => name,
    evaluatorDisplayOptions,
    evaluatorDisplayGroups,
  } = options;

  const evaluatorFormats = evaluatorDisplayOptions || new Map();
  const evaluatorScoreGroups = evaluatorDisplayGroups || [];

  const evaluatorNames = getUniqueEvaluatorNames(datasetScoresWithStats);
  const { columnNames, groupMapping } = groupEvaluatorScores(evaluatorNames, evaluatorScoreGroups);
  const overallStats = calculateOverallStats(datasetScoresWithStats);
  const totalExamples = sumBy(datasetScoresWithStats, (d) => d.numExamples);

  const formatExampleCount = (numExamples: number): string => {
    return repetitions > 1
      ? `${repetitions} x ${numExamples / repetitions}`
      : numExamples.toString();
  };

  const tableHeaders = [firstColumnHeader, '#', ...columnNames];

  const datasetRows = datasetScoresWithStats.map((dataset) => [
    styleRowName(dataset.name),
    formatExampleCount(dataset.numExamples),
    ...formatRowCells(dataset.evaluatorStats, columnNames, groupMapping, false, evaluatorFormats),
  ]);

  const overallRow = [
    chalk.bold.green('Overall'),
    chalk.bold.green(formatExampleCount(totalExamples)),
    ...formatRowCells(overallStats, columnNames, groupMapping, true, evaluatorFormats),
  ];

  return table([tableHeaders, ...datasetRows, overallRow], buildTableConfig(tableHeaders.length));
}
