/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import decisionResponse from './__fixtures__/decision_response.json';
import { parseDecisionResponse } from './parse_decision_response';

describe('parseDecisionResponse', () => {
  it('parses predicate and choice answers from the ES response', () => {
    const answers = parseDecisionResponse(decisionResponse, ['should_respond', 'pick']);

    expect(answers).toEqual({
      should_respond: { type: 'predicate', probability: 0.94 },
      pick: {
        type: 'choice',
        choice: 'a',
        confidence: 0.62,
        probabilities: { a: 0.81, b: 0.19 },
      },
    });
  });

  it('keys score probabilities by level label', () => {
    const { severity } = parseDecisionResponse(decisionResponse, ['severity']);

    expect(severity).toEqual({
      type: 'score',
      score: 1.2,
      confidence: 0.5,
      probabilities: { low: 0.1, medium: 0.6, high: 0.3 },
    });
  });

  it('throws when a requested question has no answer', () => {
    expect(() => parseDecisionResponse(decisionResponse, ['should_respond', 'missing'])).toThrow(
      /missing/
    );
  });

  it('throws when the body is not an object', () => {
    expect(() => parseDecisionResponse('oops', ['should_respond'])).toThrow();
  });

  it('throws when a predicate answer has no probability', () => {
    const body = { decision: { answers: { should_respond: { type: 'predicate' } } } };

    expect(() => parseDecisionResponse(body, ['should_respond'])).toThrow(/should_respond/);
  });
});
