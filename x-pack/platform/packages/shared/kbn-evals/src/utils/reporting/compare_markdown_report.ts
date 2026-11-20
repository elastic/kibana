/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PARAMETRIC_UPGRADE_MIN_PAIRS } from '@kbn/evals-common';
import type { RepetitionPolicy } from '@kbn/evals-common';
import { getEffectDirection } from './effect_direction';
import type { EffectDirection, WithEffectSign } from './effect_direction';
import { countHolmFamily, getEffectivePValue } from './holm_correction';
import type { CorrectableComparisonResult } from './holm_correction';
import { formatDiscordantPairs, getTestLabel } from './test_label';

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

function formatNumber(value: number | null): string {
  return value !== null && Number.isFinite(value) ? value.toFixed(2) : '-';
}

const OUTCOME_LABELS: Record<EffectDirection, string> = {
  improved: 'Improvement',
  worse: 'Regression',
  unchanged: '-',
  mixed: 'Mixed',
};

export interface MarkdownRegressionGateOptions {
  minPairs: number;
  evaluators?: readonly string[];
}

const NOT_GATED_SUFFIX = ' (not gated)';

const isGated = (
  result: CorrectableComparisonResult,
  gate: MarkdownRegressionGateOptions
): boolean =>
  result.sampleSize >= gate.minPairs &&
  (!gate.evaluators || gate.evaluators.includes(result.evaluatorName));

function formatOutcome(
  result: WithEffectSign<CorrectableComparisonResult>,
  threshold: number,
  gate: MarkdownRegressionGateOptions | undefined
): string {
  const pValue = getEffectivePValue(result);
  if (pValue === null || !Number.isFinite(pValue) || pValue >= threshold) return '-';
  const direction = getEffectDirection(result);
  const label = OUTCOME_LABELS[direction];
  return direction === 'worse' && gate && !isGated(result, gate) ? label + NOT_GATED_SUFFIX : label;
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
  targetExperimentId,
  baselineExperimentId,
  results,
  significanceThreshold = DEFAULT_SIGNIFICANCE_THRESHOLD,
  comparePageUrl,
  baselineTimestamp,
  baselineCommitSha,
  refreshBaselineUrl,
  skippedMissingPairs = 0,
  skippedNullScores = 0,
  baselineBranch = 'main',
  regressionGate,
  repetitionPolicy = 'mean',
  rejectedSlices = [],
}: {
  targetExperimentId: string;
  baselineExperimentId: string;
  results: Array<WithEffectSign<CorrectableComparisonResult>>;
  significanceThreshold?: number;
  comparePageUrl?: string;
  baselineTimestamp?: string;
  baselineCommitSha?: string;
  refreshBaselineUrl?: string;
  skippedMissingPairs?: number;
  skippedNullScores?: number;
  baselineBranch?: string;
  /** When the regression gate runs, regressions it cannot trip on are marked "(not gated)". */
  regressionGate?: MarkdownRegressionGateOptions;
  repetitionPolicy?: RepetitionPolicy;
  rejectedSlices?: string[];
}): string {
  const sortedResults = [...results].sort(
    (a, b) =>
      a.datasetName.localeCompare(b.datasetName) || a.evaluatorName.localeCompare(b.evaluatorName)
  );

  const isSignificant = (result: CorrectableComparisonResult): boolean => {
    const pValue = getEffectivePValue(result);
    return pValue !== null && Number.isFinite(pValue) && pValue < significanceThreshold;
  };
  const multiplicityCorrected = sortedResults.some((result) => result.adjustedPValue !== undefined);

  const significantCount = sortedResults.filter(isSignificant).length;

  // A suite with one repetition per example has no stability to show.
  const showStability = sortedResults.some(
    (result) => result.target.stability !== null || result.baseline.stability !== null
  );

  const lines: string[] = [];

  lines.push(
    `**PR run**: ${targetExperimentId} | **Baseline (${baselineBranch})**: ${baselineExperimentId}`
  );

  if (baselineTimestamp) {
    const diffDays = daysSince(baselineTimestamp);
    const commitLabel = baselineCommitSha ? `commit ${baselineCommitSha.slice(0, 7)}` : '';
    const age = relativeAge(diffDays);
    const parts = [commitLabel, age].filter(Boolean);
    lines.push(`Baseline: ${parts.join(', ')}`);

    if (diffDays >= STALENESS_WARNING_DAYS) {
      lines.push(
        `> **Warning**: Baseline is ${diffDays} days old. Results may not reflect current ${baselineBranch}.`
      );
    }
  }

  lines.push(
    multiplicityCorrected
      ? `Significance threshold: Holm-Bonferroni adjusted p < ${significanceThreshold} (across ${countHolmFamily(
          sortedResults
        )} comparisons; raw p-values shown alongside)`
      : `Significance threshold: p < ${significanceThreshold}`
  );
  lines.push(
    `Repetition policy: ${repetitionPolicy} (N counts examples${
      showStability
        ? "; stability is the mean standard deviation across an example's repetitions"
        : ''
    }).`
  );
  lines.push(
    `Test per row is chosen from the scores: McNemar when every compared score is 0 or 1, otherwise Wilcoxon signed-rank (paired t-test for continuous scores when n ≥ ${PARAMETRIC_UPGRADE_MIN_PAIRS} and differences look normal).`
  );
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

  if (skippedMissingPairs > 0 || skippedNullScores > 0) {
    const parts: string[] = [];
    if (skippedMissingPairs > 0) {
      parts.push(`${skippedMissingPairs} unpaired`);
    }
    if (skippedNullScores > 0) {
      parts.push(`${skippedNullScores} null scores`);
    }
    lines.push(
      `> **Note**: ${parts.join(
        ', '
      )} skipped. Comparison may be incomplete — the baseline could be a partial run.`
    );
  }

  if (rejectedSlices.length > 0) {
    lines.push(
      `> **Note**: Left out of the median comparison (score outside [0, 1]): ${rejectedSlices.join(
        ', '
      )}.`
    );
  }

  if (sortedResults.some((r) => r.repetitionWarning)) {
    lines.push(
      '> **Warning**: in rows marked N*, some examples have a different number of valid repetitions in the two runs, or null scores.'
    );
  }

  const actionLinks: string[] = [];
  if (comparePageUrl) {
    actionLinks.push(`[View full comparison in UI](${comparePageUrl})`);
  }
  if (refreshBaselineUrl) {
    actionLinks.push(
      `[Refresh baseline against latest ${baselineBranch}](${refreshBaselineUrl}) *(click Unblock in the eval build)*`
    );
  }
  if (actionLinks.length > 0) {
    lines.push('');
    lines.push(actionLinks.join(' | '));
  }

  lines.push('');

  const significantResults = sortedResults.filter(isSignificant);
  const nonSignificantResults = sortedResults.filter((r) => !isSignificant(r));

  const renderTable = (rows: CorrectableComparisonResult[]) => {
    const tableLines: string[] = [];
    const headers = [
      'Dataset',
      'Evaluator',
      'N',
      'Mean (PR)',
      `Mean (${baselineBranch})`,
      'Diff',
      'Test',
      'p-value',
      ...(multiplicityCorrected ? ['Adj. p-value'] : []),
      'Sig',
      'Outcome',
      ...(showStability ? [`Stability (PR/${baselineBranch})`] : []),
    ];
    tableLines.push(`| ${headers.join(' | ')} |`);
    tableLines.push(`| ${headers.map(() => '---').join(' | ')} |`);
    rows.forEach((r) => {
      const delta = r.target.mean - r.baseline.mean;
      const cols = [
        escapeTableCell(r.datasetName),
        escapeTableCell(r.evaluatorName),
        `${r.sampleSize}${r.repetitionWarning ? '*' : ''}`,
        formatNumber(r.target.mean),
        formatNumber(r.baseline.mean),
        formatDifference(delta) + formatDiscordantPairs(r.hypothesisTest),
        getTestLabel(r.hypothesisTest.id),
        formatPValue(r.pValue),
        ...(multiplicityCorrected ? [formatPValue(r.adjustedPValue ?? null)] : []),
        formatSig(getEffectivePValue(r), significanceThreshold),
        formatOutcome(r, significanceThreshold, regressionGate),
        ...(showStability
          ? [`${formatNumber(r.target.stability)} / ${formatNumber(r.baseline.stability)}`]
          : []),
      ];
      tableLines.push(`| ${cols.join(' | ')} |`);
    });
    return tableLines.join('\n');
  };

  if (significantResults.length > 0) {
    lines.push('**Significant changes**');
    lines.push('');
    lines.push(renderTable(significantResults));
    lines.push('');
    const hasUngatedRegression = significantResults.some((result) =>
      formatOutcome(result, significanceThreshold, regressionGate).endsWith(NOT_GATED_SUFFIX)
    );
    if (regressionGate && hasUngatedRegression) {
      const reasons = regressionGate.evaluators
        ? `fewer than ${regressionGate.minPairs} pairs or outside \`--regression-evaluators\``
        : `fewer than ${regressionGate.minPairs} pairs`;
      lines.push(`_Regression (not gated)_: ${reasons}, so it cannot fail the regression gate.`);
      lines.push('');
    }
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
