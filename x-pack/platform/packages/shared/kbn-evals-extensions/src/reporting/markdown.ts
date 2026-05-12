/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompositeScoreResult, CiGateResult, GateFailure } from '../types';

export interface EvaluatorSummary {
  name: string;
  kind: 'LLM' | 'CODE';
  score: number | null;
  label?: string | null;
  explanation?: string | null;
}

export interface MarkdownReportConfig {
  title?: string;
  runId?: string;
  timestamp?: string;
  durationMs?: number;
  passThreshold?: number;
}

export interface MarkdownReportInput {
  evaluatorResults: EvaluatorSummary[];
  compositeScore?: CompositeScoreResult;
  gateResult?: CiGateResult;
}

const GRADE_BADGES: Record<string, string> = {
  A: '🟢 A',
  B: '🔵 B',
  C: '🟡 C',
  D: '🟠 D',
  F: '🔴 F',
};

const formatScore = (score: number | null): string => {
  if (score === null) return 'N/A';
  return (score * 100).toFixed(1) + '%';
};

const formatPassFail = (score: number | null, threshold: number): string => {
  if (score === null) return '-';
  return score >= threshold ? 'PASS' : 'FAIL';
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const renderGateFailures = (failures: GateFailure[]): string => {
  const lines: string[] = ['', '### Gate Failures', ''];
  for (const failure of failures) {
    lines.push(
      `- **${failure.gate}**${failure.evaluator ? ` (${failure.evaluator})` : ''}: ${
        failure.message
      }`
    );
  }
  return lines.join('\n');
};

/**
 * Generates a GitHub-friendly markdown report from evaluation results.
 */
export const generateMarkdownReport = (
  input: MarkdownReportInput,
  config?: MarkdownReportConfig
): string => {
  const title = config?.title ?? 'Skill Evaluation Report';
  const passThreshold = config?.passThreshold ?? 0.8;
  const lines: string[] = [];

  // Header
  lines.push(`# ${title}`);
  lines.push('');

  // Metadata
  if (config?.runId || config?.timestamp || config?.durationMs) {
    const metaParts: string[] = [];
    if (config?.runId) metaParts.push(`**Run:** \`${config.runId}\``);
    if (config?.timestamp) metaParts.push(`**Time:** ${config.timestamp}`);
    if (config?.durationMs) metaParts.push(`**Duration:** ${formatDuration(config.durationMs)}`);
    lines.push(metaParts.join(' | '));
    lines.push('');
  }

  // Composite score + grade
  if (input.compositeScore) {
    const badge =
      GRADE_BADGES[input.compositeScore.compositeGrade] ?? input.compositeScore.compositeGrade;
    lines.push(`## Overall: ${formatScore(input.compositeScore.compositeScore)} ${badge}`);
    lines.push('');
  }

  // CI gate status
  if (input.gateResult) {
    const gateStatus = input.gateResult.passed ? 'PASSED' : 'FAILED';
    lines.push(`**CI Gate:** ${gateStatus}`);
    lines.push('');
  }

  // Per-evaluator table
  lines.push('## Evaluator Results');
  lines.push('');
  lines.push('| Evaluator | Kind | Score | Status |');
  lines.push('| --- | --- | --- | --- |');

  for (const result of input.evaluatorResults) {
    const status = formatPassFail(result.score, passThreshold);
    lines.push(`| ${result.name} | ${result.kind} | ${formatScore(result.score)} | ${status} |`);
  }

  lines.push('');

  // Dimension scores if available
  if (input.compositeScore && Object.keys(input.compositeScore.dimensionScores).length > 0) {
    lines.push('## Dimension Scores');
    lines.push('');
    lines.push('| Dimension | Score |');
    lines.push('| --- | --- |');
    for (const [dimension, score] of Object.entries(input.compositeScore.dimensionScores)) {
      lines.push(`| ${dimension} | ${formatScore(score)} |`);
    }
    lines.push('');
  }

  // Gate failures
  if (input.gateResult && !input.gateResult.passed && input.gateResult.failedGates.length > 0) {
    lines.push(renderGateFailures(input.gateResult.failedGates));
    lines.push('');
  }

  // Failure details
  const failures = input.evaluatorResults.filter(
    (r) => r.score !== null && r.score < passThreshold && r.explanation
  );
  if (failures.length > 0) {
    lines.push('## Failure Details');
    lines.push('');
    for (const failure of failures) {
      lines.push(`### ${failure.name}`);
      lines.push('');
      lines.push(`- **Score:** ${formatScore(failure.score)}`);
      lines.push(`- **Explanation:** ${failure.explanation}`);
      lines.push('');
    }
  }

  return lines.join('\n');
};
