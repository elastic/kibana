/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionQuestion } from '@kbn/agent-builder-server';
import decisionResponse from './__fixtures__/decision_response.json';
import { parseDecisionResponse } from './parse_decision_response';

const predicate: DecisionQuestion = {
  type: 'predicate',
  instructions: 'Should the agent respond?',
};
const choice: DecisionQuestion = {
  type: 'choice',
  instructions: 'Pick one',
  choices: { a: 'A', b: 'B' },
};
const score: DecisionQuestion = {
  type: 'score',
  instructions: 'How severe?',
  levels: [
    { label: 'low', description: 'Low' },
    { label: 'medium', description: 'Medium' },
    { label: 'high', description: 'High' },
  ],
};

describe('parseDecisionResponse', () => {
  it('reads the answers by position, in the order of the questions', () => {
    const answers = parseDecisionResponse(decisionResponse, [predicate, choice]);

    expect(answers).toEqual([
      { type: 'predicate', probability: 0.94 },
      { type: 'choice', choice: 'a', confidence: 0.62, probabilities: { a: 0.81, b: 0.19 } },
    ]);
  });

  it('keys score probabilities by level label', () => {
    const [, , severity] = parseDecisionResponse(decisionResponse, [predicate, choice, score]);

    expect(severity).toEqual({
      type: 'score',
      score: 1.2,
      confidence: 0.5,
      probabilities: { low: 0.1, medium: 0.6, high: 0.3 },
    });
  });

  it('throws when a question has no answer', () => {
    expect(() =>
      parseDecisionResponse(decisionResponse, [predicate, choice, score, predicate])
    ).toThrow(/question_4/);
  });

  it('throws when an answer has a different type than its question', () => {
    expect(() => parseDecisionResponse(decisionResponse, [choice])).toThrow(
      'Decision answer [question_1] has type [predicate], expected [choice]'
    );
  });

  it('throws when the body is not an object', () => {
    expect(() => parseDecisionResponse('oops', [predicate])).toThrow();
  });

  it('throws when a predicate answer has no probability', () => {
    const body = { decision: { answers: { question_1: { type: 'predicate' } } } };

    expect(() => parseDecisionResponse(body, [predicate])).toThrow(/question_1/);
  });
});
