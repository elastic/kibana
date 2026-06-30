/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PairedTTestResult } from '@kbn/evals-common';

const DEFAULT_SIGNIFICANCE_THRESHOLD = 0.05;
const STALENESS_WARNING_DAYS = 3;

function formatPValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }
  return value.toFixed(2);
}

function formatSig(pValue: number | null, threshold: number): string {
  if (pValue === null || !Number.isFinite(pValue)) {
    return 'n/a';
  }
  return pValue < threshold ? 'Yes' : 'No';
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}

function formatDifference(value: number): string {
  if (!Number.isFinite(value)) {
    return '-';
  }
  if (value > 0) {
    return `+${value.toFixed(2)}`;
  }
  return value.toFixed(2);
}

function escapeTableCell(value: string): string {
  return value.replaceAll('|', '\\|');
}

function daysSince(timestamp: string): number {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function relativeAge(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function formatMarkdownCompareReport({
  experimentIdA,
  experimentIdB,
  results,
  significanceThreshold = DEFAULT_SIGNIFICANCE_THRESHOLD,
  comparePageUrl,
  baselineTimestamp,
  baselineCommitSha,
  refreshBaselineUrl,
}: {
  experimentIdA: string;
  experimentIdB: string;
  results: PairedTTestResult[];
  significanceThreshold?: number;
  comparePageUrl?: string;
  baselineTimestamp?: string;
  baselineCommitSha?: string;
  refreshBaselineUrl?: string;
}): string {
  const sortedResults = [...results].sort(
    (a, b) =>
      a.datasetName.localeCompare(b.datasetName) || a.evaluatorName.localeCompare(b.evaluatorName)
  );

  const significantCount = sortedResults.filter(
    (result) =>
      result.pValue !== null &&
      Number.isFinite(result.pValue) &&
      result.pValue < significanceThreshold
  ).length;

  const lines: string[] = [];

  lines.push(`**PR run**: ${experimentIdA} | **Baseline (main)**: ${experimentIdB}`);

  if (baselineTimestamp) {
    const diffDays = daysSince(baselineTimestamp);
    const commitLabel = baselineCommitSha ? `commit ${baselineCommitSha.slice(0, 7)}` : '';
    const age = relativeAge(diffDays);
    const parts = ['Baseline:', commitLabel, age].filter(Boolean);
    lines.push(parts.join(', '));

    if (diffDays >= STALENESS_WARNING_DAYS) {
      lines.push(
        `> **Warning**: Baseline is ${diffDays} days old. Results may not reflect current main.`
      );
    }
  }

  lines.push(`Significance threshold: p < ${significanceThreshold}`);
  lines.push('');

  lines.push('**Summary**');
  if (significantCount === 0) {
    lines.push(
      `No significant regressions detected (${sortedResults.length} evaluator comparisons).`
    );
  } else {
    lines.push(
      `${significantCount} significant difference(s) detected out of ${sortedResults.length} comparisons.`
    );
  }

  const actionLinks: string[] = [];
  if (comparePageUrl) {
    actionLinks.push(`[View full comparison in UI](${comparePageUrl})`);
  }
  if (refreshBaselineUrl) {
    actionLinks.push(`[Refresh baseline against latest main](${refreshBaselineUrl})`);
  }
  if (actionLinks.length > 0) {
    lines.push('');
    lines.push(actionLinks.join(' | '));
  }

  lines.push('');

  const significantResults = sortedResults.filter(
    (r) => r.pValue !== null && Number.isFinite(r.pValue) && r.pValue < significanceThreshold
  );
  const nonSignificantResults = sortedResults.filter(
    (r) => r.pValue === null || !Number.isFinite(r.pValue) || r.pValue >= significanceThreshold
  );

  const renderTable = (rows: PairedTTestResult[]) => {
    const tableLines: string[] = [];
    tableLines.push('| Dataset | Evaluator | N | Mean (PR) | Mean (main) | Diff | p-value | Sig |');
    tableLines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    rows.forEach((r) => {
      const delta = r.meanA - r.meanB;
      tableLines.push(
        `| ${escapeTableCell(r.datasetName)} | ${escapeTableCell(r.evaluatorName)} | ${
          r.sampleSize
        } | ${formatNumber(r.meanA)} | ${formatNumber(r.meanB)} | ${formatDifference(
          delta
        )} | ${formatPValue(r.pValue)} | ${formatSig(r.pValue, significanceThreshold)} |`
      );
    });
    return tableLines.join('\n');
  };

  if (significantResults.length > 0) {
    lines.push('**Significant changes**');
    lines.push('');
    lines.push(renderTable(significantResults));
    lines.push('');
  }

  if (nonSignificantResults.length > 0) {
    lines.push(
      `<details><summary>No significant changes (${nonSignificantResults.length} rows)</summary>`
    );
    lines.push('');
    lines.push(renderTable(nonSignificantResults));
    lines.push('');
    lines.push('</details>');
  }

  return lines.join('\n');
}
