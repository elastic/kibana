/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents';

export const getPrompts = (output: TaskOutput): PromptRequest[] => {
  const prompts = (output as { prompts?: unknown[] })?.prompts ?? [];
  return prompts.filter(
    (p): p is PromptRequest => typeof p === 'object' && p !== null && 'type' in p
  );
};

export const summarizePrompt = (prompt: PromptRequest) => {
  if (isAskUserQuestionPrompt(prompt)) {
    return {
      type: prompt.type,
      questions: prompt.questions.map((q) => ({
        question: q.question,
        options: q.options.map((o) => o.label),
        multiSelect: q.multi_select,
      })),
    };
  }
  return { type: prompt.type };
};

interface ConversationOutput {
  messages?: Array<{ message?: string }>;
  errors?: unknown[];
  traceId?: string;
}

const isConversationOutput = (output: unknown): output is ConversationOutput =>
  typeof output === 'object' && output !== null;

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
      const prompts = getPrompts(output as TaskOutput);
      const errors = conversationOutput.errors ?? [];

      const sections = [
        `\n━━━━━━ LOW SCORE: ${evaluator.name} = ${result.score} ━━━━━━`,
        `Intent:      ${intent}`,
        result.label ? `Label:       ${result.label}` : undefined,
        `Explanation: ${result.explanation ?? '(none)'}`,
        result.reasoning ? `Reasoning:   ${result.reasoning}` : undefined,
        `Expected:    ${formatValue(expected)}`,
        `--- Conversation ---\n${formatTranscript(conversationOutput)}`,
        prompts.length > 0
          ? `--- Prompts ---\n${formatValue(prompts.map(summarizePrompt))}`
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
