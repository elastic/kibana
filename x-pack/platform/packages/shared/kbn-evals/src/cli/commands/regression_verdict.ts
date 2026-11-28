/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_REGRESSION_REPORT_CONFIG,
  resolveJudgeModelIds,
  type RegressionReportConfig,
  type RegressionReportThresholds,
  type RegressionReport,
} from '@kbn/evals-common';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  escapeTableCell,
  DEFAULT_SIGNIFICANCE_THRESHOLD,
} from '../../utils/reporting/compare_markdown_report';

const GATE_ICONS = { pass: '✅', warn: '⚠️', fail: '❌' } as const;

const THRESHOLD_KEYS = ['failRelativeChange', 'warnRelativeChange', 'alpha'] as const;

const validateThresholds = (value: unknown, label: string): Partial<RegressionReportThresholds> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object of gate thresholds.`);
  }
  for (const [key, threshold] of Object.entries(value)) {
    if (!(THRESHOLD_KEYS as readonly string[]).includes(key)) {
      throw new Error(
        `${label} has an unknown threshold "${key}" (known: ${THRESHOLD_KEYS.join(', ')}).`
      );
    }
    if (typeof threshold !== 'number' || !Number.isFinite(threshold)) {
      throw new Error(`${label}.${key} must be a finite number, got ${JSON.stringify(threshold)}.`);
    }
    if (threshold <= 0 || (key === 'alpha' && threshold >= 1)) {
      throw new Error(
        `${label}.${key} must be ${
          key === 'alpha' ? 'between 0 and 1 exclusive' : 'greater than 0'
        }, got ${threshold}.`
      );
    }
  }
  return value as Partial<RegressionReportThresholds>;
};

const assertCoherent = (thresholds: RegressionReportThresholds, label: string): void => {
  if (thresholds.warnRelativeChange > thresholds.failRelativeChange) {
    throw new Error(
      `${label}: warnRelativeChange (${thresholds.warnRelativeChange}) must not exceed ` +
        `failRelativeChange (${thresholds.failRelativeChange}).`
    );
  }
};

/**
 * Parses and validates a `--report-gates` JSON override. Every value is checked rather than
 * merged blindly: a null alpha or a "15%" string would otherwise silently disable the gate
 * it was meant to tune, producing a confident but wrong verdict.
 */
export const parseRegressionReportConfig = (json: string): RegressionReportConfig => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('the gates file must hold an object with "defaults" and/or "evaluators".');
  }
  for (const key of Object.keys(parsed)) {
    if (key !== 'defaults' && key !== 'evaluators') {
      throw new Error(`unknown top-level key "${key}" (known: defaults, evaluators).`);
    }
  }
  const raw = parsed as { defaults?: unknown; evaluators?: unknown };

  const defaults: RegressionReportThresholds = {
    ...DEFAULT_REGRESSION_REPORT_CONFIG.defaults,
    ...(raw.defaults !== undefined ? validateThresholds(raw.defaults, '"defaults"') : {}),
  };
  assertCoherent(defaults, '"defaults"');

  let evaluators: RegressionReportConfig['evaluators'];
  if (raw.evaluators !== undefined) {
    if (
      raw.evaluators === null ||
      typeof raw.evaluators !== 'object' ||
      Array.isArray(raw.evaluators)
    ) {
      throw new Error('"evaluators" must map evaluator names to threshold overrides.');
    }
    evaluators = {};
    for (const [evaluatorName, overrides] of Object.entries(raw.evaluators)) {
      const validated = validateThresholds(overrides, `"evaluators"."${evaluatorName}"`);
      assertCoherent({ ...defaults, ...validated }, `"evaluators"."${evaluatorName}"`);
      evaluators[evaluatorName] = validated;
    }
  }

  return { defaults, evaluators };
};

/**
 * Returns why the target run's judge makes the comparison invalid, or undefined when the
 * judges match. An unidentified judge never passes as a match: a baseline without judge
 * attribution is only comparable to a run that also has none (code-only evaluators), and a
 * judge-scored baseline requires the target's scores to name that same single judge.
 */
export const findJudgeMismatch = ({
  baselineJudgeModelId,
  targetScores,
}: {
  baselineJudgeModelId: string | null | undefined;
  targetScores: EvaluationScoreDocument[];
}): string | undefined => {
  const baselineJudge = baselineJudgeModelId ?? null;
  const targetJudges = resolveJudgeModelIds(targetScores);

  if (baselineJudge === null && targetJudges.length === 0) {
    return undefined;
  }
  if (baselineJudge !== null && targetJudges.length === 1 && targetJudges[0] === baselineJudge) {
    return undefined;
  }

  const describe = (judges: string[]): string =>
    judges.length === 0 ? 'no identifiable judge' : `judge "${judges.join('", "')}"`;
  return (
    `Judge mismatch: the pinned baseline has ${
      baselineJudge === null ? 'no identifiable judge' : `judge "${baselineJudge}"`
    } but this run has ${describe(targetJudges)}. The comparison is invalid — ` +
    `re-run with the pinned judge, or pin a new baseline under the new judge.`
  );
};

const formatGateChange = (relativeChange: number | null): string =>
  relativeChange == null ? '—' : `${(relativeChange * 100).toFixed(1)}% worse`;

/**
 * The regression verdict for the PR comment: the headline answer ("regression or not")
 * ahead of the full comparison table, listing only the slices that tripped a gate.
 * Report-only — the verdict never fails the command. Baseline (dataset, evaluator) slices absent from the
 * gated results are called out and qualify a passing headline, since their slices were never
 * gated at all.
 */
export const formatRegressionReportMarkdown = (
  report: RegressionReport,
  {
    missingBaselineSlices = [],
    config,
  }: { missingBaselineSlices?: string[]; config?: RegressionReportConfig } = {}
): string => {
  const lines: string[] = [];
  if (report.verdict === 'fail') {
    lines.push(`### ${GATE_ICONS.fail} Regression detected (report-only)`);
  } else if (report.verdict === 'warn') {
    lines.push(`### ${GATE_ICONS.warn} No regression, with warnings`);
  } else if (missingBaselineSlices.length > 0) {
    lines.push(`### ${GATE_ICONS.warn} No regression in the compared slices (partial coverage)`);
  } else {
    lines.push(`### ${GATE_ICONS.pass} No regression against the pinned baseline`);
  }
  // The gates and the detailed table test significance independently, with possibly
  // different alphas: say so, or a slice can read "regression" up here and "not
  // significant" in the table below with no visible reason.
  if (config) {
    const { failRelativeChange, warnRelativeChange, alpha } = config.defaults;
    // Full precision, trimmed: a 0.5% threshold rounded to "1%" would contradict the
    // verdicts computed right above it.
    const pct = (fraction: number): string => `${parseFloat((fraction * 100).toFixed(4))}%`;
    lines.push('');
    lines.push(
      `_Gates: fail at a >=${pct(failRelativeChange)} significant worsening ` +
        `(p < ${alpha}), warn at >=${pct(warnRelativeChange)} or any significant ` +
        `worsening${config.evaluators ? ', with per-evaluator overrides' : ''}. The comparison ` +
        `table below marks significance at p < ${DEFAULT_SIGNIFICANCE_THRESHOLD}, independently ` +
        `of these gates._`
    );
  }
  if (missingBaselineSlices.length > 0) {
    lines.push('');
    lines.push(
      `> **Warning**: baseline slice(s) ${missingBaselineSlices
        .map((name) => `\`${name}\``)
        .join(', ')} were not compared in this run (not present, all scores null, or ` +
        `excluded by the repetition policy), so the verdict does not cover them.`
    );
  }
  const flagged = [...report.regressions, ...report.warnings];
  if (flagged.length > 0) {
    lines.push('');
    lines.push('| Dataset | Evaluator | Verdict | Change | p-value |');
    lines.push('|---|---|---|---|---|');
    for (const gate of flagged) {
      lines.push(
        `| ${escapeTableCell(gate.datasetName)} | ${escapeTableCell(gate.evaluatorName)} | ${
          GATE_ICONS[gate.verdict]
        } ${gate.verdict} | ${formatGateChange(gate.relativeChange)} | ${
          gate.pValue?.toFixed(4) ?? '—'
        } |`
      );
    }
  }
  return lines.join('\n');
};

export const logRegressionReport = (
  log: SomeDevLog,
  report: RegressionReport,
  { missingBaselineSlices = [] }: { missingBaselineSlices?: string[] } = {}
): void => {
  const summary = `Regression gates (report-only): ${report.verdict.toUpperCase()} — ${
    report.regressions.length
  } regression(s), ${report.warnings.length} warning(s).`;
  if (report.verdict === 'fail') {
    log.error(summary);
  } else if (report.verdict === 'warn') {
    log.warning(summary);
  } else {
    log.info(summary);
  }
  if (missingBaselineSlices.length > 0) {
    log.warning(
      `  Baseline slice(s) not compared in this run (not gated): ${missingBaselineSlices.join(
        ', '
      )}`
    );
  }
  for (const gate of [...report.regressions, ...report.warnings]) {
    const line = `  ${GATE_ICONS[gate.verdict]} ${gate.datasetName} / ${gate.evaluatorName}: ${
      gate.reason
    }`;
    if (gate.verdict === 'fail') {
      log.error(line);
    } else {
      log.warning(line);
    }
  }
};
