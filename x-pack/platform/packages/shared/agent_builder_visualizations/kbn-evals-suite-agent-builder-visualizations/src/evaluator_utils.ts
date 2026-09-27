/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ExtractedVisualization } from './extract_visualization';

/** Plain-object guard for walking untyped tool payloads and gold configs. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Vega-Lite reads `.`, `[` and `]` in an encoding `field` as nested access, so a
 * flat ES|QL column such as `host.name` must be written `host\\.name`. Returns the
 * column name the field refers to.
 */
export const unescapeVegaField = (field: string): string => field.replace(/\\([.[\]])/g, '$1');

/** Shared result for evaluators with nothing to check; `null` keeps them out of averages. */
export const skippedResult = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'skipped',
  explanation,
});

interface LoggableOutput {
  visualizations?: ExtractedVisualization[];
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

const formatVisualization = (visualization: ExtractedVisualization, index: number): string =>
  [
    `  [${index}] renderer=${visualization.renderer ?? 'lens'} chart_type=${
      visualization.chartType ?? '(none)'
    }`,
    `      esql: ${visualization.esql}`,
    visualization.visualization
      ? `      config: ${JSON.stringify(visualization.visualization)}`
      : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');

const isAbstention = (result: EvaluationResult): boolean =>
  result.score === null && result.label !== 'skipped';

/**
 * Logs everything needed to diagnose a score below 1, or a harness-side
 * abstention (`score: null` with a label other than `skipped`), in one place:
 * the question, the gold, every produced visualization with its ES|QL and
 * config, the evaluator's explanation and metadata, and the agent trace id.
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
    const input = params.input as { question?: string; followUp?: string } | undefined;
    const question = input?.question;
    const followUp = input?.followUp;
    const visualizations = output.visualizations ?? [];
    const errors = output.errors ?? [];
    const traceId = output.agentTraceId ?? output.traceId;

    const sections = [
      lowScore
        ? `\n━━━━━━ LOW SCORE: ${evaluator.name} = ${result.score} ━━━━━━`
        : `\n━━━━━━ ABSTAINED: ${evaluator.name} (${result.label}) ━━━━━━`,
      question ? `Question:    ${question}` : undefined,
      followUp ? `Follow-up:   ${followUp}` : undefined,
      result.label ? `Label:       ${result.label}` : undefined,
      `Explanation: ${result.explanation ?? '(none)'}`,
      `--- Gold ---\n${formatValue(params.expected)}`,
      visualizations.length > 0
        ? `--- Produced visualizations ---\n${visualizations.map(formatVisualization).join('\n')}`
        : `--- Produced visualizations ---\n  (none)`,
      result.metadata ? `--- Evaluator metadata ---\n${formatValue(result.metadata)}` : undefined,
      errors.length > 0 ? `--- Task errors ---\n${formatValue(errors)}` : undefined,
      traceId ? `Trace id:    ${traceId}` : undefined,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].filter((section): section is string => section !== undefined);

    log.warning(sections.join('\n'));
    return result;
  },
});

/**
 * Positive-only evaluators have nothing to say about a refusal example: a
 * missing visualization is the correct outcome there, not a failure.
 */
export const skipRefusalExamples = <
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(
  evaluator: Evaluator<TExample, TTaskOutput>,
  isRefusalExample: (expected: TExample['output']) => boolean
): Evaluator<TExample, TTaskOutput> => ({
  ...evaluator,
  evaluate: async (params) =>
    isRefusalExample(params.expected)
      ? skippedResult('Refusal example; this evaluator scores produced visualizations only.')
      : evaluator.evaluate(params),
});
