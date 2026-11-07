/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionAnswer, DecisionQuestion } from '@kbn/agent-builder-server';
import { questionKey } from './question_keys';

interface RawProbability {
  value?: unknown;
  label?: unknown;
  probability?: unknown;
}

interface RawAnswer {
  type?: unknown;
  probability?: unknown;
  choice?: unknown;
  score?: unknown;
  confidence?: unknown;
  probabilities?: unknown;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireNumber = (value: unknown, field: string, name: string): number => {
  if (typeof value !== 'number') {
    throw new Error(`Decision answer [${name}] has no numeric [${field}]`);
  }
  return value;
};

/** Keys an answer's probability list by `keyField` (`value` for choices, `label` for score levels). */
const toProbabilities = (
  value: unknown,
  keyField: 'value' | 'label',
  name: string
): Record<string, number> => {
  if (!Array.isArray(value)) {
    throw new Error(`Decision answer [${name}] has no [probabilities] list`);
  }

  return Object.fromEntries(
    value.map((entry: RawProbability) => [
      String(entry[keyField]),
      requireNumber(entry.probability, 'probability', name),
    ])
  );
};

const toAnswer = (raw: RawAnswer, name: string): DecisionAnswer => {
  switch (raw.type) {
    case 'predicate':
      return {
        type: 'predicate',
        probability: requireNumber(raw.probability, 'probability', name),
      };
    case 'choice':
      if (typeof raw.choice !== 'string') {
        throw new Error(`Decision answer [${name}] has no [choice]`);
      }
      return {
        type: 'choice',
        choice: raw.choice,
        confidence: requireNumber(raw.confidence, 'confidence', name),
        probabilities: toProbabilities(raw.probabilities, 'value', name),
      };
    case 'score':
      return {
        type: 'score',
        score: requireNumber(raw.score, 'score', name),
        confidence: requireNumber(raw.confidence, 'confidence', name),
        probabilities: toProbabilities(raw.probabilities, 'label', name),
      };
    default:
      throw new Error(`Decision answer [${name}] has unknown type [${String(raw.type)}]`);
  }
};

/**
 * Reads the answers to `questions`, in order, from a `POST _inference/decision` response body,
 * throwing when the body is malformed or a question has no answer of its own type.
 */
export const parseDecisionResponse = (
  body: unknown,
  questions: readonly DecisionQuestion[]
): DecisionAnswer[] => {
  const decision = isObject(body) ? body.decision : undefined;
  const answers = isObject(decision) ? decision.answers : undefined;

  if (!isObject(answers)) {
    throw new Error('Decision response has no [decision.answers]');
  }

  return questions.map((question, index) => {
    const name = questionKey(index);
    const raw = answers[name];

    if (!isObject(raw)) {
      throw new Error(`Decision response has no answer for question [${name}]`);
    }

    if (raw.type !== question.type) {
      throw new Error(
        `Decision answer [${name}] has type [${String(raw.type)}], expected [${question.type}]`
      );
    }

    return toAnswer(raw, name);
  });
};
