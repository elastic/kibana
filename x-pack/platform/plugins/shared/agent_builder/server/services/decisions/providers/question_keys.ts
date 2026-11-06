/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionQuestion } from '@kbn/agent-builder-server';

/** The key a question is sent under, from its position: providers need names, callers don't. */
export const questionKey = (index: number): string => `question_${index + 1}`;

export const toKeyedQuestions = (
  questions: readonly DecisionQuestion[]
): Record<string, DecisionQuestion> =>
  Object.fromEntries(questions.map((question, index) => [questionKey(index), question]));
