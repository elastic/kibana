/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RespondToPromptsFn } from './types';

interface PromptLike {
  id?: unknown;
  type?: unknown;
  questions?: unknown;
}

const isPromptLike = (prompt: unknown): prompt is PromptLike & { id: string } =>
  typeof prompt === 'object' && prompt !== null && typeof (prompt as PromptLike).id === 'string';

/**
 * Default prompt policy: answers each `ask_user_question` with the next turn's text as a
 * free-text answer, as a user typing a reply would, and lets confirmation and authorization
 * prompts proceed so the conversation can continue. Prompt types it doesn't know are left
 * unanswered.
 */
export const answerPromptsWithNextTurn: RespondToPromptsFn = (prompts, nextTurn) => {
  const responses: Record<string, unknown> = {};

  for (const prompt of prompts) {
    if (!isPromptLike(prompt)) {
      continue;
    }

    if (prompt.type === 'ask_user_question') {
      const questions = Array.isArray(prompt.questions) ? prompt.questions : [];
      responses[prompt.id] = { answers: questions.map(() => ({ custom: nextTurn.message })) };
    } else if (prompt.type === 'confirmation') {
      responses[prompt.id] = { allow: true };
    } else if (prompt.type === 'authorization') {
      responses[prompt.id] = { authorized: true };
    }
  }

  return responses;
};
