/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskOutput } from '@kbn/evals';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents';

/**
 * Extracts the structured prompts (e.g. `ask_user_question`) the agent fired in response to
 * the conversation opener (turn 0), as captured by the task in `evaluate_dataset.ts`.
 */
export const getOpenerPrompts = (output: TaskOutput): PromptRequest[] => {
  const prompts = (output as { openerPrompts?: unknown[] })?.openerPrompts ?? [];
  return prompts.filter(
    (p): p is PromptRequest => typeof p === 'object' && p !== null && 'type' in p
  );
};

/**
 * Compact, human-readable summary of a fired prompt. For an `ask_user_question` prompt this
 * surfaces the questions and their option labels so a low-score log is self-explanatory
 * ("what did the agent ask?") without digging into traces.
 */
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
