/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PairedTTestResult } from '../statistical_analysis';

const DEFAULT_SIGNIFICANCE_THRESHOLD = 0.05;

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}

function formatDiff(value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (value > 0) return `+${value.toFixed(2)}`;
  return value.toFixed(2);
}

function formatPValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-';
  return value.toFixed(4);
}

function formatSig(pValue: number | null, threshold: number): string {
  if (pValue === null || !Number.isFinite(pValue)) return 'n/a';
  return pValue < threshold ? 'Yes' : 'No';
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}

function buildMarkdownTable(headers: string[], rows: string[][]): string {
  const separator = headers.map(() => '---');
  const lines = [
    `| ${headers.map(escapeMarkdownTableCell).join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownTableCell).join(' | ')} |`),
  ];
  return lines.join('\n');
}

export interface FormatMarkdownCompareReportOptions {
  suiteId: string;
  prRunId: string;
  baselineRunId: string;
  baselineBranch: string;
  results: PairedTTestResult[];
  significanceThreshold?: number;
  kibanaUrl?: string;
}

export function formatMarkdownCompareReport({
  suiteId,
  prRunId,
  baselineRunId,
  baselineBranch,
  results,
  significanceThreshold = DEFAULT_SIGNIFICANCE_THRESHOLD,
  kibanaUrl,
}: FormatMarkdownCompareReportOptions): string {
  const sorted = [...results].sort(
    (a, b) =>
      a.datasetName.localeCompare(b.datasetName) || a.evaluatorName.localeCompare(b.evaluatorName)
  );

  const isSignificant = (r: PairedTTestResult): boolean =>
    r.pValue !== null && Number.isFinite(r.pValue) && r.pValue < significanceThreshold;

  const significant = sorted.filter(isSignificant);
  const nonSignificant = sorted.filter((r) => !isSignificant(r));

  const lines: string[] = [];

  lines.push(`### Eval Comparison: ${suiteId}`);
  lines.push('');
  lines.push(`**PR run**: \`${prRunId}\` | **Baseline (${baselineBranch})**: \`${baselineRunId}\``);
  lines.push(`Significance threshold: p < ${significanceThreshold}`);
  lines.push('');

  lines.push('#### Summary');

  if (significant.length === 0) {
    lines.push('');
    lines.push(
      `No significant regressions detected (${sorted.length} evaluator comparison${
        sorted.length !== 1 ? 's' : ''
      }).`
    );
  } else {
    lines.push('');
    lines.push(
      `- ${significant.length} significant difference(s) out of ${sorted.length} evaluator comparisons`
    );
  }

  if (kibanaUrl) {
    const compareUrl = `${kibanaUrl}/app/management/ai/evals/compare?runA=${encodeURIComponent(
      prRunId
    )}&runB=${encodeURIComponent(baselineRunId)}`;
    lines.push(`- [View full comparison in UI](${compareUrl})`);
  }

  const headers = [
    'Dataset',
    'Evaluator',
    'N',
    'Mean (PR)',
    `Mean (${baselineBranch})`,
    'Diff',
    'p-value',
    'Sig',
  ];

  const toRow = (r: PairedTTestResult): string[] => {
    const diff = r.meanA - r.meanB;
    return [
      r.datasetName,
      r.evaluatorName,
      String(r.sampleSize),
      formatNumber(r.meanA),
      formatNumber(r.meanB),
      formatDiff(diff),
      formatPValue(r.pValue),
      formatSig(r.pValue, significanceThreshold),
    ];
  };

  if (significant.length > 0) {
    lines.push('');
    lines.push('#### Results');
    lines.push('');
    lines.push(buildMarkdownTable(headers, significant.map(toRow)));
  }

  if (nonSignificant.length > 0) {
    lines.push('');
    lines.push(
      `<details><summary>No significant changes (${nonSignificant.length} rows)</summary>`
    );
    lines.push('');
    lines.push(buildMarkdownTable(headers, nonSignificant.map(toRow)));
    lines.push('');
    lines.push('</details>');
  }

  lines.push('');
  return lines.join('\n');
}
