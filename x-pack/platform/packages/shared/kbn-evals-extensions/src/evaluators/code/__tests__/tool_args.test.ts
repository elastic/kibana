/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolArgsEvaluator } from '../tool_args';

describe('tool_args evaluator', () => {
  const evaluator = createToolArgsEvaluator();

  const evaluate = (
    toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>,
    expected: Record<string, unknown>
  ) =>
    evaluator.evaluate({
      input: undefined,
      output: { toolCalls, finalOutput: '', latencyMs: 0, adapterName: 'test' },
      expected,
      metadata: undefined,
    });

  it('should return perfect score when all args match', async () => {
    const result = await evaluate([{ toolName: 'search', args: { query: 'test', limit: 10 } }], {
      toolArgs: [{ toolName: 'search', args: { query: 'test', limit: 10 } }],
    });
    expect(result.score).toBe(1.0);
    expect(result.label).toBe('pass');
  });

  it('should score proportionally for partial matches', async () => {
    const result = await evaluate([{ toolName: 'search', args: { query: 'test', limit: 5 } }], {
      toolArgs: [{ toolName: 'search', args: { query: 'test', limit: 10 } }],
    });
    expect(result.score).toBe(0.5);
  });

  it('should penalize missing tool calls', async () => {
    const result = await evaluate([], {
      toolArgs: [{ toolName: 'search', args: { query: 'test' } }],
    });
    expect(result.score).toBe(0);
    expect(result.label).toBe('fail');
  });

  it('should penalize extra args by default', async () => {
    const result = await evaluate(
      [{ toolName: 'search', args: { query: 'test', limit: 10, extra: true } }],
      { toolArgs: [{ toolName: 'search', args: { query: 'test', limit: 10 } }] }
    );
    // 2 matched out of 3 total (2 expected + 1 extra)
    expect(result.score).toBeCloseTo(2 / 3, 3);
  });

  it('should not penalize extra args when allowExtraArgs is true', async () => {
    const lenientEvaluator = createToolArgsEvaluator({ allowExtraArgs: true });
    const result = await lenientEvaluator.evaluate({
      input: undefined,
      output: {
        toolCalls: [{ toolName: 'search', args: { query: 'test', limit: 10, extra: true } }],
        finalOutput: '',
        latencyMs: 0,
        adapterName: 'test',
      },
      expected: { toolArgs: [{ toolName: 'search', args: { query: 'test', limit: 10 } }] },
      metadata: undefined,
    });
    expect(result.score).toBe(1.0);
  });

  it('should handle multiple tool calls', async () => {
    const result = await evaluate(
      [
        { toolName: 'search', args: { query: 'test' } },
        { toolName: 'filter', args: { field: 'status', value: 'open' } },
      ],
      {
        toolArgs: [
          { toolName: 'search', args: { query: 'test' } },
          { toolName: 'filter', args: { field: 'status', value: 'open' } },
        ],
      }
    );
    expect(result.score).toBe(1.0);
  });

  it('should compare nested objects', async () => {
    const result = await evaluate(
      [{ toolName: 'search', args: { filters: { status: 'open', priority: 'high' } } }],
      {
        toolArgs: [{ toolName: 'search', args: { filters: { status: 'open', priority: 'high' } } }],
      }
    );
    expect(result.score).toBe(1.0);
  });

  it('should compare arrays', async () => {
    const result = await evaluate([{ toolName: 'search', args: { tags: ['a', 'b'] } }], {
      toolArgs: [{ toolName: 'search', args: { tags: ['a', 'b'] } }],
    });
    expect(result.score).toBe(1.0);
  });

  it('should return unavailable when no tool calls in output', async () => {
    const result = await evaluator.evaluate({
      input: undefined,
      output: { finalOutput: 'some text', latencyMs: 0, adapterName: 'test' },
      expected: { toolArgs: [{ toolName: 'search', args: { query: 'test' } }] },
      metadata: undefined,
    });
    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('should return unavailable when no expected tool args', async () => {
    const result = await evaluate([{ toolName: 'search', args: { query: 'test' } }], {});
    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('has correct name and kind', () => {
    expect(evaluator.name).toBe('tool-args');
    expect(evaluator.kind).toBe('CODE');
  });
});
