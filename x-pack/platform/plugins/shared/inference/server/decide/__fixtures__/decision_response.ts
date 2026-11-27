/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const decisionResponse = {
  decision: {
    answers: {
      question_1: {
        type: 'predicate',
        probability: 0.94,
      },
      question_2: {
        type: 'choice',
        choice: 'a',
        probabilities: [
          { value: 'a', probability: 0.81 },
          { value: 'b', probability: 0.19 },
        ],
        confidence: 0.62,
      },
      question_3: {
        type: 'score',
        score: 1.2,
        probabilities: [
          { value: 0, label: 'low', probability: 0.1 },
          { value: 1, label: 'medium', probability: 0.6 },
          { value: 2, label: 'high', probability: 0.3 },
        ],
        confidence: 0.5,
      },
    },
  },
};
