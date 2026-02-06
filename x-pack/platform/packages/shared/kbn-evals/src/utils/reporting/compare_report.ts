/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chalk from 'chalk';
import { table } from 'table';
import type { PairedTTestResult } from '../statistical_analysis';

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

function formatDifference(value: number): string {
  if (!Number.isFinite(value)) {
    return chalk.gray('-');
  }
  if (value > 0) {
    return chalk.green(`+${value.toFixed(2)}`);
  }
  if (value < 0) {
    return chalk.red(value.toFixed(2));
  }
  return value.toFixed(2);
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
  runIdA,
  runIdB,
  results,
  significanceThreshold = DEFAULT_SIGNIFICANCE_THRESHOLD,
}: {
  runIdA: string;
  runIdB: string;
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

  const tableHeaders = ['Evaluator', 'N', 'Mean A', 'Mean B', 'Diff', 'p-value', 'Significant'];
  const rowsByDataset = new Map<string, string[][]>();

  sortedResults.forEach((result) => {
    const delta = result.meanA - result.meanB;
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
      formatNumber(result.meanA),
      formatNumber(result.meanB),
      formatDifference(delta),
      formatPValue(result.pValue),
      significanceLabel,
    ]);
    rowsByDataset.set(result.datasetName, rows);
  });

  const header = [
    `Run A: ${runIdA}`,
    `Run B: ${runIdB}`,
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
