/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processStructuredAnswerResponse } from './action_utils';
import { AgentActionType, type StructuredAnswerAction, type AgentErrorAction } from './actions';

describe('processStructuredAnswerResponse', () => {
  it('returns a structured answer action for a populated object', () => {
    const response = { classification: 'true_positive' };
    expect(processStructuredAnswerResponse(response).type).toBe(AgentActionType.StructuredAnswer);
  });

  it('preserves the response data on the structured answer action', () => {
    const response = { classification: 'true_positive', confidence_score: 0.9 };
    const action = processStructuredAnswerResponse(response) as StructuredAnswerAction;
    expect(action.data).toEqual(response);
  });

  it('returns an error action when the model returns an empty object', () => {
    expect(processStructuredAnswerResponse({}).type).toBe(AgentActionType.Error);
  });

  it('reports an empty structured response error message for an empty object', () => {
    const action = processStructuredAnswerResponse({}) as AgentErrorAction;
    expect(action.error.message).toBe('agent returned an empty structured response');
  });

  describe.each([
    ['a string', 'not an object'],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
  ])('when the response is %s', (_label, response) => {
    it('returns an error action', () => {
      expect(processStructuredAnswerResponse(response).type).toBe(AgentActionType.Error);
    });
  });
});
