/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chalk from 'chalk';
import { table } from 'table';
import { getEffectDirection } from './effect_direction';
import type { EffectDirection, WithEffectSign } from './effect_direction';
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

const DIFFERENCE_STYLES: Record<EffectDirection, (formatted: string) => string> = {
  improved: (formatted) => chalk.green(formatted),
  worse: (formatted) => chalk.red(formatted),
  unchanged: (formatted) => formatted,
  // The rank test and the mean disagree, so neither color would be honest.
  mixed: (formatted) => chalk.yellow(`${formatted} (mixed)`),
};

function formatDifference(value: number, effect: EffectDirection, significant: boolean): string {
  if (!Number.isFinite(value)) {
    return chalk.gray('-');
  }

  const formatted = value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  // A disagreement between test and mean only matters once the test calls the row significant.
  const style = effect === 'mixed' && !significant ? 'unchanged' : effect;
  return DIFFERENCE_STYLES[style](formatted);
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
  results: Array<WithEffectSign<CorrectableComparisonResult>>;
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

  const hasPValue = (result: CorrectableComparisonResult): boolean => {
    const pValue = getEffectivePValue(result);
    return pValue !== null && Number.isFinite(pValue);
  };
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
    const significant = isSignificant(result);
    const significanceLabel = !hasPValue(result)
      ? chalk.gray('n/a')
      : significant
      ? chalk.bold.green('yes')
      : chalk.gray('no');

    const rows = rowsByDataset.get(result.datasetName) ?? [];
    rows.push([
      result.evaluatorName,
      result.sampleSize.toString(),
      formatNumber(result.meanTarget),
      formatNumber(result.meanBaseline),
      formatDifference(delta, getEffectDirection(result), significant) +
        formatDiscordantPairs(result.hypothesisTest),
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
