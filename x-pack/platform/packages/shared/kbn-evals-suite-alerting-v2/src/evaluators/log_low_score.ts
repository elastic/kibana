/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator, Example, TaskOutput } from '@kbn/evals';
import { getOpenerPrompts, summarizePrompt } from './opener_prompts';

/** Shape of the TaskOutput produced by `createTask` in `evaluate_dataset.ts`. */
interface ConversationOutput {
  messages?: Array<{ message?: string }>;
  errors?: unknown[];
  traceId?: string;
}

const isConversationOutput = (output: unknown): output is ConversationOutput =>
  typeof output === 'object' && output !== null;

/**
 * Reconstructs the transcript from the task output. `createTask` pushes exactly two messages
 * per turn (the scripted user message, then the agent's reply), so even indices are the user
 * and odd indices are the assistant.
 */
const formatTranscript = (output: ConversationOutput): string => {
  const messages = output.messages ?? [];
  if (messages.length === 0) return '  (no messages captured)';
  return messages
    .map((m, i) => {
      const role = i % 2 === 0 ? 'user' : 'assistant';
      const text = (m?.message ?? '').trim() || '(empty)';
      return `  [${role}] ${text}`;
    })
    .join('\n');
};

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null) return String(value);
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
};

/**
 * Wraps an evaluator so that whenever it returns a numeric score below 1 (i.e. a partial or
 * outright failure), the test logs a self-contained report of exactly what happened: the
 * evaluator, its score/label, the judge's explanation, the intent under test, the full
 * conversation transcript, any opener prompts the agent fired, task errors, and the trace id.
 *
 * This means a below-1 result is diagnosable straight from the test output — no need to
 * reproduce the run by hand or dig through the HTML report / traces. A `null` score (skipped
 * or unavailable) is intentionally not logged; only genuine sub-1 scores are surfaced.
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

    if (typeof result.score === 'number' && result.score < 1) {
      const { output, expected, metadata } = params;
      const conversationOutput: ConversationOutput = isConversationOutput(output) ? output : {};
      const intent =
        (metadata as { query_intent?: string } | null)?.query_intent ?? '(no query_intent)';
      const openerPrompts = getOpenerPrompts(output as TaskOutput);
      const errors = conversationOutput.errors ?? [];

      const sections = [
        `\n━━━━━━ LOW SCORE: ${evaluator.name} = ${result.score} ━━━━━━`,
        `Intent:      ${intent}`,
        result.label ? `Label:       ${result.label}` : undefined,
        `Explanation: ${result.explanation ?? '(none)'}`,
        result.reasoning ? `Reasoning:   ${result.reasoning}` : undefined,
        `Expected:    ${formatValue(expected)}`,
        `--- Conversation ---\n${formatTranscript(conversationOutput)}`,
        openerPrompts.length > 0
          ? `--- Opener prompts ---\n${formatValue(openerPrompts.map(summarizePrompt))}`
          : undefined,
        result.metadata ? `--- Evaluator metadata ---\n${formatValue(result.metadata)}` : undefined,
        errors.length > 0 ? `--- Task errors ---\n${formatValue(errors)}` : undefined,
        conversationOutput.traceId ? `Trace id:    ${conversationOutput.traceId}` : undefined,
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ].filter((section): section is string => section !== undefined);

      log.warning(sections.join('\n'));
    }

    return result;
  },
});
