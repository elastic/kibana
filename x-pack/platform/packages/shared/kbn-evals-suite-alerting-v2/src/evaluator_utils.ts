/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents';
import type { ConversationOutput, ToolCallStep } from './types';

/** Shared skip result when an expectation field is omitted. */
export const skippedResult = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'skipped',
  explanation,
});

export const requireNonEmptyStringList = (
  value: readonly string[] | undefined,
  fieldName: string,
  itemLabel: string
): readonly string[] => {
  if (value == null) {
    return [];
  }
  const items = value.filter((item) => item.length > 0);
  if (items.length === 0) {
    throw new Error(`${fieldName} must be a non-empty array of ${itemLabel}`);
  }
  return items;
};

export const getPrompts = (output: TaskOutput): PromptRequest[] => {
  const prompts = (output as { prompts?: unknown[] })?.prompts ?? [];
  return prompts.filter(
    (p): p is PromptRequest => typeof p === 'object' && p !== null && 'type' in p
  );
};

/** Projects each conversation round into user/assistant message pairs. */
export const messagesFromRounds = (
  rounds: ConversationRound[]
): Array<{ role: 'user' | 'assistant'; message: string }> =>
  rounds.flatMap((round) => [
    { role: 'user' as const, message: round.input.message },
    { role: 'assistant' as const, message: round.response?.message ?? '' },
  ]);

/** Assistant message text from the task output's messages projection. */
export const getAssistantMessages = (output: TaskOutput): string[] => {
  const messages =
    (output as { messages?: Array<{ role?: string; message?: string }> })?.messages ?? [];
  return messages
    .filter((message) => message?.role === 'assistant')
    .map((message) => message?.message ?? '')
    .filter(Boolean);
};

/** Tool-call steps from task output, including params/results when present. */
export const getToolCallSteps = (output: TaskOutput): ToolCallStep[] => {
  const steps = (output as { steps?: ToolCallStep[] })?.steps ?? [];
  return steps.filter((step) => step?.type === 'tool_call');
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

const isConversationOutput = (output: unknown): output is ConversationOutput =>
  typeof output === 'object' && output !== null;

const formatTranscript = (output: ConversationOutput): string => {
  const rounds = output.rounds;
  if (Array.isArray(rounds) && rounds.length > 0) {
    return rounds
      .flatMap((round) => {
        const user = (round.input?.message ?? '').trim() || '(empty)';
        const assistant = (round.response?.message ?? '').trim() || '(empty)';
        return [`  [user] ${user}`, `  [assistant] ${assistant}`];
      })
      .join('\n');
  }

  const messages = output.messages ?? [];
  if (messages.length === 0) return '  (no messages captured)';
  return messages
    .map((m) => {
      const role = m?.role ?? 'unknown';
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
  log: ToolingLog,
  options?: { testTitle?: string }
): Evaluator<TExample, TTaskOutput> => ({
  ...evaluator,
  evaluate: async (params) => {
    const result = await evaluator.evaluate(params);

    if (typeof result.score === 'number' && result.score < 1) {
      const { output, expected } = params;
      const conversationOutput: ConversationOutput = isConversationOutput(output) ? output : {};
      const testTitle = options?.testTitle ?? '(unknown test)';
      const prompts = getPrompts(output as TaskOutput);
      const errors = conversationOutput.errors ?? [];

      const sections = [
        `\n━━━━━━ LOW SCORE: ${evaluator.name} = ${result.score} ━━━━━━`,
        `Test:        ${testTitle}`,
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
