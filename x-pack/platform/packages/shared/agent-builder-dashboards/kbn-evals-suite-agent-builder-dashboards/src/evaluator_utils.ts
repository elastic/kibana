/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { formatDashboard } from './dashboard_panels';

/** Shared result for a missing dashboard; it scores 0, so the run counts against the average. */
export const noDashboardResult: EvaluationResult = {
  score: 0,
  label: 'no-dashboard',
  explanation: 'No dashboard was produced.',
};

/** One gold assertion of a fraction-scored evaluator. */
export interface Check {
  assertion: string;
  passed: boolean;
  detail: string;
}

/** Scores the fraction of checks that hold, listing the failed ones. */
export const scoreChecks = (
  checks: readonly Check[],
  { subject, passLabel, metadata }: { subject: string; passLabel: string; metadata?: object }
): EvaluationResult => {
  const failed = checks.filter(({ passed }) => !passed);
  return {
    score: (checks.length - failed.length) / checks.length,
    label: failed.length === 0 ? passLabel : 'mismatch',
    explanation:
      failed.length === 0
        ? `All ${checks.length} ${subject} assertions hold.`
        : failed.map(({ assertion, detail }) => `${assertion}: ${detail}`).join('; '),
    metadata: { checks, ...metadata },
  };
};

export const skippedResult = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'skipped',
  explanation,
});

interface LoggableOutput {
  dashboard?: DashboardAttachmentData;
  messages?: Array<{ message?: string }>;
  errors?: unknown[];
  agentTraceId?: string;
  traceId?: string;
}

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return String(value);
  }
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};

const isAbstention = (result: EvaluationResult): boolean =>
  result.score === null && result.label !== 'skipped';

/**
 * Logs everything needed to diagnose a score below 1, or a harness-side
 * abstention, in one place: the request, the gold, the produced dashboard
 * (one line per panel with its ES|QL), the evaluator's explanation and
 * metadata, and the agent trace id.
 */
export const withLowScoreLogging = <
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(
  evaluator: Evaluator<TExample, TTaskOutput>,
  log: ToolingLog
): Evaluator<TExample, TTaskOutput> => ({
  ...evaluator,
  evaluate: async (params) => {
    const result = await evaluator.evaluate(params);
    const lowScore = typeof result.score === 'number' && result.score < 1;
    if (!lowScore && !isAbstention(result)) {
      return result;
    }

    const output = (params.output ?? {}) as LoggableOutput;
    const question = (params.input as { question?: string } | undefined)?.question;
    const errors = output.errors ?? [];
    const traceId = output.agentTraceId ?? output.traceId;
    const lastMessage = output.messages?.at(-1)?.message;

    const sections = [
      lowScore
        ? `\n━━━━━━ LOW SCORE: ${evaluator.name} = ${result.score} ━━━━━━`
        : `\n━━━━━━ ABSTAINED: ${evaluator.name} (${result.label}) ━━━━━━`,
      question ? `Question:    ${question}` : undefined,
      result.label ? `Label:       ${result.label}` : undefined,
      `Explanation: ${result.explanation ?? '(none)'}`,
      `--- Gold ---\n${formatValue(params.expected)}`,
      `--- Produced dashboard ---\n${
        output.dashboard ? formatDashboard(output.dashboard) : '  (none)'
      }`,
      lastMessage ? `--- Last agent message ---\n${lastMessage}` : undefined,
      result.metadata ? `--- Evaluator metadata ---\n${formatValue(result.metadata)}` : undefined,
      errors.length > 0 ? `--- Task errors ---\n${formatValue(errors)}` : undefined,
      traceId ? `Trace id:    ${traceId}` : undefined,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].filter((section): section is string => section !== undefined);

    log.warning(sections.join('\n'));
    return result;
  },
});

/** Wraps an evaluator so it only scores examples `applies` accepts and skips the rest. */
export const onlyWhen = <
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(
  evaluator: Evaluator<TExample, TTaskOutput>,
  applies: (expected: TExample['output']) => boolean,
  skipReason: string
): Evaluator<TExample, TTaskOutput> => ({
  ...evaluator,
  evaluate: async (params) =>
    applies(params.expected) ? evaluator.evaluate(params) : skippedResult(skipReason),
});
