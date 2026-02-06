/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { table } from 'table';
import chalk from 'chalk';
import type { EvaluatorStats } from '../score_repository';
import { expandPatternsToEvaluators, matchesEvaluatorPattern } from '../../evaluators/patterns';

interface StatsDisplay {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

export interface EvaluatorDisplayOptions {
  decimalPlaces?: number;
  unitSuffix?: string;
  statsToInclude?: Array<keyof StatsDisplay>;
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

function getUniqueEvaluatorNames(stats: EvaluatorStats[]): string[] {
  return [...new Set(stats.map((s) => s.evaluatorName))].sort();
}

function getUniqueDatasets(stats: EvaluatorStats[]): Array<{ id: string; name: string }> {
  const seen = new Map<string, string>();
  stats.forEach((s) => {
    if (!seen.has(s.datasetId)) {
      seen.set(s.datasetId, s.datasetName);
    }
  });
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

function calculateOverallStats(stats: EvaluatorStats[]): EvaluatorStats[] {
  const evaluatorNames = getUniqueEvaluatorNames(stats);

  return evaluatorNames.map((evaluatorName) => {
    const evaluatorStats = stats.filter((s) => s.evaluatorName === evaluatorName);

    if (evaluatorStats.length === 0) {
      return {
        datasetId: 'overall',
        datasetName: 'Overall',
        evaluatorName,
        stats: { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 },
      };
    }

    const totalCount = evaluatorStats.reduce((sum, s) => sum + s.stats.count, 0);

    if (totalCount === 0) {
      return {
        datasetId: 'overall',
        datasetName: 'Overall',
        evaluatorName,
        stats: { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 },
      };
    }

    const weightedMean =
      evaluatorStats.reduce((sum, s) => sum + s.stats.mean * s.stats.count, 0) / totalCount;

    const pooledVariance =
      totalCount > 1
        ? evaluatorStats.reduce((sum, s) => {
            return (
              sum +
              (s.stats.count - 1) * s.stats.stdDev ** 2 +
              s.stats.count * (s.stats.mean - weightedMean) ** 2
            );
          }, 0) /
          (totalCount - 1)
        : 0;

    return {
      datasetId: 'overall',
      datasetName: 'Overall',
      evaluatorName,
      stats: {
        mean: weightedMean,
        median: weightedMean,
        stdDev: Math.sqrt(pooledVariance),
        min: Math.min(...evaluatorStats.map((s) => s.stats.min)),
        max: Math.max(...evaluatorStats.map((s) => s.stats.max)),
        count: totalCount,
      },
    };
  });
}

/** Gets display options for an evaluator, supporting @K pattern matching */
function getEvaluatorDisplayOptions(
  evaluatorName: string,
  evaluatorFormats: Map<string, EvaluatorDisplayOptions>
): EvaluatorDisplayOptions {
  const exactMatch = evaluatorFormats.get(evaluatorName);
  if (exactMatch) return exactMatch;

  for (const [pattern, options] of evaluatorFormats.entries()) {
    if (matchesEvaluatorPattern(evaluatorName, pattern)) {
      return options;
    }
  }
  return {};
}

/** Groups evaluator scores, expanding @K patterns to actual evaluator names */
function groupEvaluatorScores(
  evaluatorNames: string[],
  evaluatorScoreGroups: EvaluatorDisplayGroup[]
): {
  columnNames: string[];
  groupMapping: Map<string, EvaluatorDisplayGroup>;
} {
  const groupMapping = new Map<string, EvaluatorDisplayGroup>();
  const grouped = new Set<string>();

  for (const group of evaluatorScoreGroups) {
    const expandedNames = expandPatternsToEvaluators(group.evaluatorNames, evaluatorNames);
    if (expandedNames.length > 0) {
      groupMapping.set(group.combinedColumnName, {
        evaluatorNames: expandedNames,
        combinedColumnName: group.combinedColumnName,
      });
      expandedNames.forEach((name) => grouped.add(name));
    }
  }

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
  stats: Partial<StatsDisplay>,
  evaluatorName: string,
  isBold: boolean,
  evaluatorFormats: Map<string, EvaluatorDisplayOptions>
): string {
  const colorFn = isBold ? chalk.bold.green : chalk.cyan;

  const evaluatorConfig = getEvaluatorDisplayOptions(evaluatorName, evaluatorFormats);
  const decimalPlaces = evaluatorConfig.decimalPlaces ?? 2;
  const unitSuffix = evaluatorConfig.unitSuffix || '';
  const statsToInclude = evaluatorConfig.statsToInclude;

  const statLabels: Array<[keyof StatsDisplay, string]> = [
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
      const formatted = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(decimalPlaces);
      return colorFn(`${label}: ${formatted}${unitSuffix}`);
    })
    .join('\n');
}

function formatEvaluatorScoreGroupCell(
  statsMap: Map<string, Partial<StatsDisplay>>,
  group: EvaluatorDisplayGroup,
  isBold: boolean,
  evaluatorFormats: Map<string, EvaluatorDisplayOptions>
): string {
  const sections = group.evaluatorNames
    .map((evaluatorName) => {
      const stats = statsMap.get(evaluatorName);
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
  statsForDataset: EvaluatorStats[],
  columnNames: string[],
  groupMapping: Map<string, EvaluatorDisplayGroup>,
  isBold: boolean,
  evaluatorFormats: Map<string, EvaluatorDisplayOptions>
): string[] {
  const statsMap = new Map<string, StatsDisplay>();
  statsForDataset.forEach((s) => statsMap.set(s.evaluatorName, s.stats));

  return columnNames.map((columnName) => {
    const group = groupMapping.get(columnName);
    if (group) {
      const groupStatsMap = new Map<string, Partial<StatsDisplay>>(
        group.evaluatorNames
          .map((name) => [name, statsMap.get(name)] as const)
          .filter((entry): entry is [string, StatsDisplay] => entry[1] !== undefined)
      );
      return formatEvaluatorScoreGroupCell(groupStatsMap, group, isBold, evaluatorFormats);
    }

    const stats = statsMap.get(columnName);
    if (stats && stats.count > 0) {
      return formatStatsCell(stats, columnName, isBold, evaluatorFormats);
    }
    return isBold ? chalk.bold.green('-') : chalk.gray('-');
  });
}

export function createTable(
  stats: EvaluatorStats[],
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

  const evaluatorNames = getUniqueEvaluatorNames(stats);
  const datasets = getUniqueDatasets(stats);
  const { columnNames, groupMapping } = groupEvaluatorScores(evaluatorNames, evaluatorScoreGroups);
  const overallStats = calculateOverallStats(stats);

  const getDatasetCount = (datasetId: string): number => {
    const datasetStats = stats.filter((s) => s.datasetId === datasetId);
    if (datasetStats.length === 0) return 0;
    return Math.max(...datasetStats.map((s) => s.stats.count));
  };

  const totalCount = datasets.reduce((sum, d) => sum + getDatasetCount(d.id), 0);

  const formatCount = (count: number): string => {
    return repetitions > 1 ? `${repetitions} x ${count / repetitions}` : count.toString();
  };

  const tableHeaders = [firstColumnHeader, '#', ...columnNames];

  const datasetRows = datasets.map((dataset) => {
    const datasetStats = stats.filter((s) => s.datasetId === dataset.id);
    return [
      styleRowName(dataset.name),
      formatCount(getDatasetCount(dataset.id)),
      ...formatRowCells(datasetStats, columnNames, groupMapping, false, evaluatorFormats),
    ];
  });

  const overallRow = [
    chalk.bold.green('Overall'),
    chalk.bold.green(formatCount(totalCount)),
    ...formatRowCells(overallStats, columnNames, groupMapping, true, evaluatorFormats),
  ];

  return table([tableHeaders, ...datasetRows, overallRow], buildTableConfig(tableHeaders.length));
}
