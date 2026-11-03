/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionAnswer, DecisionQuestion } from '@kbn/agent-builder-server';
import type { DecisionProvider } from './types';
import { DecisionProviderUnavailableError } from './types';

/**
 * Temporary dev path to OpenRouter's alpha Decisions API, until decision models are served by EIS.
 * Mirrors the translation of the EIS gateway's OpenRouter decide provider (elastic/eis-gateway#2607).
 */
export interface OpenRouterDecideConfig {
  apiKey: string;
  model: string;
  url: string;
}

interface OpenRouterQuestion {
  type: 'noul' | 'choice' | 'score';
  instructions: string;
  criteria?: Record<string, string | null> | string[];
}

interface OpenRouterAnswer {
  type?: string;
  noul?: number;
  choice?: string;
  score?: number;
  confidence?: number;
  probabilities?: Record<string, number>;
}

const toOpenRouterQuestion = (question: DecisionQuestion): OpenRouterQuestion => {
  switch (question.type) {
    case 'predicate':
      return { type: 'noul', instructions: question.instructions };
    case 'choice':
      return {
        type: 'choice',
        instructions: question.instructions,
        criteria: Object.fromEntries(
          Object.entries(question.choices).map(([value, description]) => [
            value,
            description || null,
          ])
        ),
      };
    case 'score':
      return {
        type: 'score',
        instructions: question.instructions,
        criteria: question.levels.map(({ label, description }) =>
          description ? `${label}: ${description}` : label
        ),
      };
  }
};

const requireNumber = (value: unknown, field: string, name: string): number => {
  if (typeof value !== 'number') {
    throw new Error(`OpenRouter answer [${name}] has no numeric [${field}]`);
  }
  return value;
};

const toAnswer = (
  question: DecisionQuestion,
  answer: OpenRouterAnswer,
  name: string
): DecisionAnswer => {
  const expected = toOpenRouterQuestion(question).type;

  if (answer.type !== expected) {
    throw new Error(`OpenRouter answer [${name}] is [${answer.type}], expected [${expected}]`);
  }

  switch (question.type) {
    case 'predicate':
      return { type: 'predicate', probability: requireNumber(answer.noul, 'noul', name) };
    case 'choice':
      if (typeof answer.choice !== 'string') {
        throw new Error(`OpenRouter answer [${name}] has no [choice]`);
      }
      return {
        type: 'choice',
        choice: answer.choice,
        confidence: requireNumber(answer.confidence, 'confidence', name),
        probabilities: answer.probabilities ?? {},
      };
    case 'score':
      // OpenRouter keys level probabilities by position; the levels give them their labels back.
      return {
        type: 'score',
        score: requireNumber(answer.score, 'score', name),
        confidence: requireNumber(answer.confidence, 'confidence', name),
        probabilities: Object.fromEntries(
          Object.entries(answer.probabilities ?? {}).map(([position, probability]) => [
            question.levels[Number(position)]?.label ?? position,
            probability,
          ])
        ),
      };
  }
};

/** Asks OpenRouter's Decisions API the questions, throwing on any error or unusable answer. */
export const decideWithOpenRouter = async ({
  config: { apiKey, model, url },
  input,
  questions,
  signal,
}: {
  config: OpenRouterDecideConfig;
  input: string;
  questions: Record<string, DecisionQuestion>;
  signal?: AbortSignal;
}): Promise<Record<string, DecisionAnswer>> => {
  const response = await fetch(`${url.replace(/\/+$/, '')}/alpha/decisions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      state: input,
      questions: Object.fromEntries(
        Object.entries(questions).map(([name, question]) => [name, toOpenRouterQuestion(question)])
      ),
      provider: { only: ['typesafe'], data_collection: 'deny', zdr: true },
    }),
  });

  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message = `OpenRouter decisions request failed with ${response.status}: ${
      body?.error?.message ?? response.statusText
    }`;

    // A rejected key stays rejected until the config changes.
    if (response.status === 401 || response.status === 403) {
      throw new DecisionProviderUnavailableError(message);
    }

    throw new Error(message);
  }

  const answers: Record<string, OpenRouterAnswer> = body?.answers ?? {};

  return Object.fromEntries(
    Object.entries(questions).map(([name, question]) => {
      const answer = answers[name];

      if (!answer) {
        throw new Error(`OpenRouter response has no answer for question [${name}]`);
      }

      return [name, toAnswer(question, answer, name)];
    })
  );
};

/** Answers through OpenRouter's Decisions API. Temporary, until EIS serves decision models. */
export const createOpenRouterDecisionProvider = (
  config: OpenRouterDecideConfig
): DecisionProvider => ({
  id: 'openrouter',
  decide: async ({ input, questions, signal }) => ({
    inferenceId: `openrouter:${config.model}`,
    answers: await decideWithOpenRouter({ config, input, questions, signal }),
  }),
});
