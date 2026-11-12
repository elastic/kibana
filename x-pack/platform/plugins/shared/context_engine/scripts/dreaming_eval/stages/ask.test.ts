/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalTarget } from '../types';
import { questionFor, toolCallsOf } from './ask';

const target: EvalTarget = {
  id: 'q1',
  dataset: 'longmemeval_s',
  category: 'temporal-reasoning',
  question: 'How many days ago did I visit MoMA?',
  answer: '7 days',
};

describe('ask stage', () => {
  it('tells the agent the date a question is asked on, when the target has one', () => {
    expect(questionFor({ ...target, askedAt: '2023-01-15T10:00:00.000Z' })).toBe(
      '(Today is 2023-01-15.) How many days ago did I visit MoMA?'
    );
    expect(questionFor(target)).toBe('How many days ago did I visit MoMA?');
  });

  it('lists the tools a round called, and the queries it ran, through dynamic calls too', () => {
    expect(
      toolCallsOf([
        { type: 'reasoning' },
        {
          type: 'tool_call',
          tool_id: 'platform.context_engine.query_ai_indices',
          params: { query: 'FROM ai-index-idx-eval | LIMIT 5' },
        },
        { type: 'tool_call', tool_id: 'platform.context_engine.describe_ai_index', params: {} },
        {
          type: 'tool_call',
          tool_id: 'platform.core.execute_dynamic_tool',
          params: {
            tool_id: 'platform.context_engine.query_ai_indices',
            params: { query: 'FROM ai-index-idx-eval | WHERE MATCH(content, "MoMA")' },
          },
        },
      ])
    ).toEqual([
      {
        tool: 'platform.context_engine.query_ai_indices',
        query: 'FROM ai-index-idx-eval | LIMIT 5',
      },
      { tool: 'platform.context_engine.describe_ai_index' },
      {
        tool: 'platform.context_engine.query_ai_indices',
        query: 'FROM ai-index-idx-eval | WHERE MATCH(content, "MoMA")',
      },
    ]);
    expect(toolCallsOf(undefined)).toEqual([]);
  });
});
