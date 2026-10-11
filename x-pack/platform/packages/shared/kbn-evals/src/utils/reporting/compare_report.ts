/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chalk from 'chalk';
import { table } from 'table';
import { isImproved } from '@kbn/evals-common';
import type { Direction, PairedTTestResult } from '@kbn/evals-common';

const DEFAULT_SIGNIFICANCE_THRESHOLD = 0.05;

function formatPValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return chalk.gray('-');
  }
  return value.toFixed(2);
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}

function formatDifference(value: number, direction: Direction): string {
  if (!Number.isFinite(value)) {
    return chalk.gray('-');
  }

  const formatted = value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);

  if (value === 0 || direction === 'neutral') {
    return formatted;
  }

  return isImproved(value, direction) ? chalk.green(formatted) : chalk.red(formatted);
}

function buildTableConfig(columnCount: number): {
  columns: Record<number, { alignment: 'right' | 'left' }>;
} {
  const columns: Record<number, { alignment: 'right' | 'left' }> = {
    0: { alignment: 'left' },
    1: { alignment: 'left' },
  };

  for (let i = 2; i < columnCount; i++) {
    columns[i] = { alignment: 'right' };
  }

  return { columns };
}

export function formatPairedTTestReport({
  targetExperimentId,
  baselineExperimentId,
  results,
  significanceThreshold = DEFAULT_SIGNIFICANCE_THRESHOLD,
}: {
  targetExperimentId: string;
  baselineExperimentId: string;
  results: PairedTTestResult[];
  significanceThreshold?: number;
}): {
  header: string[];
  summary: string;
  tableOutput: string;
  significantCount: number;
} {
  const sortedResults = [...results].sort(
    (a, b) =>
      a.datasetName.localeCompare(b.datasetName) || a.evaluatorName.localeCompare(b.evaluatorName)
  );

  const significantCount = sortedResults.filter(
    (result) => result.pValue !== null && result.pValue < significanceThreshold
  ).length;

  const tableHeaders = [
    'Evaluator',
    'N',
    'Mean (target)',
    'Mean (baseline)',
    'Diff',
    'p-value',
    'Significant',
  ];
  const rowsByDataset = new Map<string, string[][]>();

  sortedResults.forEach((result) => {
    const delta = result.meanTarget - result.meanBaseline;
    const isSignificant = result.pValue !== null && result.pValue < significanceThreshold;
    const significanceLabel =
      result.pValue === null
        ? chalk.gray('n/a')
        : isSignificant
        ? chalk.bold.green('yes')
        : chalk.gray('no');

    const rows = rowsByDataset.get(result.datasetName) ?? [];
    rows.push([
      result.evaluatorName,
      result.sampleSize.toString(),
      formatNumber(result.meanTarget),
      formatNumber(result.meanBaseline),
      formatDifference(delta, result.direction),
      formatPValue(result.pValue),
      significanceLabel,
    ]);
    rowsByDataset.set(result.datasetName, rows);
  });

  const header = [
    `Target: ${targetExperimentId}`,
    `Baseline: ${baselineExperimentId}`,
    `Significance threshold: p < ${significanceThreshold}`,
  ];
  const summary = `Significant differences: ${significantCount}/${sortedResults.length}`;
  const tableOutput = [...rowsByDataset.entries()]
    .map(([datasetName, rows]) => {
      const datasetHeader = chalk.bold(datasetName);
      const datasetTable = table([tableHeaders, ...rows], buildTableConfig(tableHeaders.length));
      return `${datasetHeader}\n${datasetTable}`;
    })
    .join('\n');

  return { header, summary, tableOutput, significantCount };
}
