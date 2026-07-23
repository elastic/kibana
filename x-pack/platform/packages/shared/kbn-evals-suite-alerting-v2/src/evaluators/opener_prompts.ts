/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskOutput } from '@kbn/evals';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents';

export const getOpenerPrompts = (output: TaskOutput): PromptRequest[] => {
  const prompts = (output as { openerPrompts?: unknown[] })?.openerPrompts ?? [];
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
