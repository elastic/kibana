/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import type { DecisionAnswer, DecisionQuestion, DecisionType } from '@kbn/inference-common';
import { createInferenceProviderError } from '@kbn/inference-common';

/** The key a question is sent under, from its position: providers need names, callers don't. */
export const questionKey = (index: number): string => `question_${index + 1}`;

const toProbabilities = (entries: Array<[string, number]>): Record<string, number> =>
  Object.fromEntries(entries);

const responseSchema = lazySchema(() =>
  z.object({
    decision: z.object({
      answers: z.record(z.string(), z.object({ type: z.string() }).loose()),
    }),
  })
);

/**
 * One schema per decision type, reading Elasticsearch's answer format into the public answer
 * type, so a new type or a changed answer doesn't compile until its schema matches.
 */
const answerSchemas = lazySchema((): { [T in DecisionType]: z.ZodType<DecisionAnswer<T>> } => ({
  predicate: z.object({
    type: z.literal('predicate'),
    probability: z.number(),
  }),
  choice: z.object({
    type: z.literal('choice'),
    choice: z.string(),
    confidence: z.number(),
    probabilities: z
      .array(z.object({ value: z.string(), probability: z.number() }))
      .transform((entries) =>
        toProbabilities(entries.map(({ value, probability }) => [value, probability]))
      ),
  }),
  score: z.object({
    type: z.literal('score'),
    score: z.number(),
    confidence: z.number(),
    probabilities: z
      .array(z.object({ label: z.string(), probability: z.number() }))
      .transform((entries) =>
        toProbabilities(entries.map(({ label, probability }) => [label, probability]))
      ),
  }),
}));

/**
 * Reads the answers to `questions`, in order, from a `POST _inference/decision` response body,
 * throwing when the body is malformed, a question has no answer of its own type or a choice isn't
 * one the question offers.
 */
export const parseDecisionResponse = (
  body: unknown,
  questions: readonly DecisionQuestion[]
): DecisionAnswer[] => {
  const response = responseSchema.safeParse(body);

  if (!response.success) {
    throw createInferenceProviderError('Decision response has no [decision.answers]');
  }

  const { answers } = response.data.decision;

  return questions.map((question, index) => {
    const name = questionKey(index);
    const raw = answers[name];

    if (!raw) {
      throw createInferenceProviderError(`Decision response has no answer for question [${name}]`);
    }

    if (raw.type !== question.type) {
      throw createInferenceProviderError(
        `Decision answer [${name}] has type [${raw.type}], expected [${question.type}]`
      );
    }

    const answer = answerSchemas[question.type].safeParse(raw);

    if (!answer.success) {
      throw createInferenceProviderError(
        `Decision answer [${name}] is malformed: ${z.prettifyError(answer.error)}`
      );
    }

    const { data } = answer;

    if (
      question.type === 'choice' &&
      data.type === 'choice' &&
      !Object.hasOwn(question.choices, data.choice)
    ) {
      throw createInferenceProviderError(
        `Decision answer [${name}] has choice [${data.choice}], which the question doesn't offer`
      );
    }

    return data;
  });
};
