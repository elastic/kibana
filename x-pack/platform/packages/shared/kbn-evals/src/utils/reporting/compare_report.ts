/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chalk from 'chalk';
import { table } from 'table';
import { isImproved } from '@kbn/evals-common';
import type { Direction } from '@kbn/evals-common';
import { countHolmFamily, getEffectivePValue } from './holm_correction';
import type { CorrectableComparisonResult } from './holm_correction';
import { formatDiscordantPairs, getTestLabel } from './test_label';

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

export function formatCompareReport({
  targetExperimentId,
  baselineExperimentId,
  results,
  significanceThreshold = DEFAULT_SIGNIFICANCE_THRESHOLD,
}: {
  targetExperimentId: string;
  baselineExperimentId: string;
  results: CorrectableComparisonResult[];
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

  const isSignificant = (result: CorrectableComparisonResult): boolean => {
    const pValue = getEffectivePValue(result);
    return pValue !== null && pValue < significanceThreshold;
  };
  const multiplicityCorrected = sortedResults.some((result) => result.adjustedPValue !== undefined);

  const significantCount = sortedResults.filter(isSignificant).length;

  const tableHeaders = [
    'Evaluator',
    'N',
    'Mean (target)',
    'Mean (baseline)',
    'Diff',
    'Test',
    'p-value',
    ...(multiplicityCorrected ? ['Adj. p-value'] : []),
    'Significant',
  ];
  const rowsByDataset = new Map<string, string[][]>();

  sortedResults.forEach((result) => {
    const delta = result.meanTarget - result.meanBaseline;
    const significanceLabel =
      getEffectivePValue(result) === null
        ? chalk.gray('n/a')
        : isSignificant(result)
        ? chalk.bold.green('yes')
        : chalk.gray('no');

    const rows = rowsByDataset.get(result.datasetName) ?? [];
    rows.push([
      result.evaluatorName,
      result.sampleSize.toString(),
      formatNumber(result.meanTarget),
      formatNumber(result.meanBaseline),
      formatDifference(delta, result.direction) + formatDiscordantPairs(result.hypothesisTest),
      getTestLabel(result.hypothesisTest.id),
      formatPValue(result.pValue),
      ...(multiplicityCorrected ? [formatPValue(result.adjustedPValue ?? null)] : []),
      significanceLabel,
    ]);
    rowsByDataset.set(result.datasetName, rows);
  });

  const header = [
    `Target: ${targetExperimentId}`,
    `Baseline: ${baselineExperimentId}`,
    multiplicityCorrected
      ? `Significance threshold: Holm-Bonferroni adjusted p < ${significanceThreshold} (across ${countHolmFamily(
          sortedResults
        )} comparisons)`
      : `Significance threshold: p < ${significanceThreshold}`,
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
