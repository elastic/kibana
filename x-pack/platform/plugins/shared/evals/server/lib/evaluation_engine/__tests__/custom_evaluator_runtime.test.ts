/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  executeCodeEvaluator,
  executeLlmJudgeEvaluator,
  executeEsqlEvaluator,
} from '../custom_evaluator_runtime';

describe('executeCodeEvaluator', () => {
  const defaultParams = {
    input: { text: 'hello' },
    output: 'world',
    expected: 'world',
    metadata: {},
  };

  it('handles numeric return', () => {
    const result = executeCodeEvaluator('return 0.85;', defaultParams);
    expect(result).toEqual({ score: 0.85 });
  });

  it('handles boolean true return', () => {
    const result = executeCodeEvaluator('return output === expected;', defaultParams);
    expect(result).toEqual({ score: 1.0, label: 'pass' });
  });

  it('handles boolean false return', () => {
    const result = executeCodeEvaluator('return output !== expected;', defaultParams);
    expect(result).toEqual({ score: 0.0, label: 'fail' });
  });

  it('handles object return with score', () => {
    const result = executeCodeEvaluator(
      'return { score: 0.5, label: "partial", explanation: "half right" };',
      defaultParams
    );
    expect(result).toEqual({
      score: 0.5,
      label: 'partial',
      explanation: 'half right',
    });
  });

  it('throws on invalid return type', () => {
    expect(() => executeCodeEvaluator('return "invalid";', defaultParams)).toThrow(
      'Code evaluator must return a number, boolean, or { score, label?, explanation? }'
    );
  });

  it('can use sandbox utilities', () => {
    const result = executeCodeEvaluator(
      'return mathMin(1.0, jsonStringify(input).length / 100);',
      defaultParams
    );
    expect(result.score).toBeGreaterThan(0);
  });

  it('blocks constructor chain escape', () => {
    expect(() =>
      executeCodeEvaluator('return ({}).constructor.constructor("return process")()', {
        input: {},
        output: '',
        expected: null,
        metadata: null,
      })
    ).toThrow();
  });

  it('times out after 5 seconds', () => {
    expect(() => executeCodeEvaluator('while(true) {}', defaultParams)).toThrow();
  });

  it('cannot access Node.js globals', () => {
    expect(() =>
      executeCodeEvaluator('return typeof require !== "undefined" ? 0 : 1;', defaultParams)
    ).not.toThrow();
    const result = executeCodeEvaluator(
      'return typeof require === "undefined" ? 1 : 0;',
      defaultParams
    );
    expect(result.score).toBe(1);
  });
});

describe('executeLlmJudgeEvaluator', () => {
  it('parses boolean scoring mode', async () => {
    const mockClient = {
      chatComplete: jest.fn().mockResolvedValue({
        content: '{"score": true, "explanation": "Good answer"}',
      }),
    };

    const result = await executeLlmJudgeEvaluator(
      {
        promptTemplate: 'Evaluate: {input} -> {output} (expected: {reference})',
        scoringMode: 'boolean',
        feedbackKey: 'correctness',
      },
      { input: { q: 'test' }, output: 'answer', expected: 'answer' },
      mockClient
    );

    expect(result.score).toBe(1.0);
    expect(result.label).toBe('pass');
    expect(result.explanation).toBe('Good answer');
  });

  it('parses continuous scoring mode', async () => {
    const mockClient = {
      chatComplete: jest.fn().mockResolvedValue({
        content: '{"score": 0.75, "reasoning": "Mostly correct"}',
      }),
    };

    const result = await executeLlmJudgeEvaluator(
      {
        promptTemplate: 'Rate: {output}',
        scoringMode: 'continuous',
        feedbackKey: 'quality',
      },
      { input: {}, output: 'answer', expected: undefined },
      mockClient
    );

    expect(result.score).toBe(0.75);
    expect(result.explanation).toBe('Mostly correct');
  });

  it('substitutes template variables in prompt', async () => {
    const mockClient = {
      chatComplete: jest.fn().mockResolvedValue({
        content: '{"score": 1.0}',
      }),
    };

    await executeLlmJudgeEvaluator(
      {
        promptTemplate: 'Input: {input}\nOutput: {output}\nRef: {reference}',
        scoringMode: 'continuous',
        feedbackKey: 'test',
      },
      { input: { q: 'question' }, output: 'the answer', expected: 'expected answer' },
      mockClient
    );

    const calledWith = mockClient.chatComplete.mock.calls[0][0];
    expect(calledWith.messages[0].content).toContain('question');
    expect(calledWith.messages[0].content).toContain('the answer');
    expect(calledWith.messages[0].content).toContain('expected answer');
  });

  it('throws when LLM response does not contain JSON', async () => {
    const mockClient = {
      chatComplete: jest.fn().mockResolvedValue({
        content: 'I cannot evaluate this.',
      }),
    };

    await expect(
      executeLlmJudgeEvaluator(
        {
          promptTemplate: 'Rate: {output}',
          scoringMode: 'continuous',
          feedbackKey: 'test',
        },
        { input: {}, output: 'answer', expected: undefined },
        mockClient
      )
    ).rejects.toThrow('LLM judge did not return valid JSON');
  });

  it('throws a descriptive error when JSON is malformed', async () => {
    const mockClient = {
      chatComplete: jest.fn().mockResolvedValue({
        content: 'Here is my answer: {score: invalid}',
      }),
    };

    await expect(
      executeLlmJudgeEvaluator(
        {
          promptTemplate: 'Rate: {output}',
          scoringMode: 'continuous',
          feedbackKey: 'test',
        },
        { input: {}, output: 'answer', expected: undefined },
        mockClient
      )
    ).rejects.toThrow('LLM judge returned invalid JSON');
  });
});

describe('executeEsqlEvaluator', () => {
  it('executes an ES|QL query and returns a score', async () => {
    const mockEsClient = {
      esql: {
        query: jest.fn().mockResolvedValue({
          columns: [{ name: 'count', type: 'long' }],
          values: [[10]],
        }),
      },
    };

    const result = await executeEsqlEvaluator(
      {
        queryTemplate: 'FROM logs | STATS count = COUNT(*)',
        scoreExpression: 'row_count > 0 ? 1.0 : 0.0',
        passCondition: 'score >= 0.5',
      },
      { input: {}, output: '' },
      mockEsClient as any
    );

    expect(result.score).toBe(1.0);
    expect(result.label).toBe('pass');
  });
});
