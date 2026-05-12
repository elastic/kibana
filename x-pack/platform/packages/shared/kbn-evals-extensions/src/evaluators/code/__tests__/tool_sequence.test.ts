/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolSequenceEvaluator } from '../tool_sequence';

describe('tool_sequence evaluator', () => {
  const evaluator = createToolSequenceEvaluator();

  const evaluate = (toolNames: string[], expectedSequence: string[]) =>
    evaluator.evaluate({
      input: undefined,
      output: {
        toolCalls: toolNames.map((name) => ({ toolName: name, args: {} })),
        finalOutput: '',
        latencyMs: 0,
        adapterName: 'test',
      },
      expected: { toolSequence: expectedSequence },
      metadata: undefined,
    });

  it('should return 1.0 for exact sequence match', async () => {
    const result = await evaluate(['search', 'filter', 'sort'], ['search', 'filter', 'sort']);
    expect(result.score).toBe(1.0);
    expect(result.label).toBe('pass');
  });

  it('should return 1.0 when actual has extra tools but order is preserved', async () => {
    // LCS of [search, log, filter, sort] and [search, filter, sort] = 3/3 = 1.0
    const result = await evaluate(
      ['search', 'log', 'filter', 'sort'],
      ['search', 'filter', 'sort']
    );
    expect(result.score).toBe(1.0);
  });

  it('should score based on LCS for reordered sequences', async () => {
    // LCS of [sort, filter, search] and [search, filter, sort] = 1/3
    // The only common subsequence in order is "filter" (length 1)
    const result = await evaluate(['sort', 'filter', 'search'], ['search', 'filter', 'sort']);
    expect(result.score).toBeCloseTo(1 / 3, 3);
  });

  it('should return 0 when no common subsequence', async () => {
    const result = await evaluate(['a', 'b', 'c'], ['x', 'y', 'z']);
    expect(result.score).toBe(0);
    expect(result.label).toBe('fail');
  });

  it('should handle partial overlap', async () => {
    // LCS of [search, filter] and [search, filter, sort] = 2/3
    const result = await evaluate(['search', 'filter'], ['search', 'filter', 'sort']);
    expect(result.score).toBeCloseTo(2 / 3, 3);
  });

  it('should handle repeated tool names', async () => {
    // LCS of [search, search, filter] and [search, filter, search] = 2/3
    const result = await evaluate(['search', 'search', 'filter'], ['search', 'filter', 'search']);
    expect(result.score).toBeCloseTo(2 / 3, 3);
  });

  it('should return unavailable when no tool calls in output', async () => {
    const result = await evaluator.evaluate({
      input: undefined,
      output: { finalOutput: '', latencyMs: 0, adapterName: 'test' },
      expected: { toolSequence: ['search'] },
      metadata: undefined,
    });
    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('should return unavailable when no expected sequence', async () => {
    const result = await evaluate(['search'], []);
    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('should return unavailable when expected is not provided', async () => {
    const result = await evaluator.evaluate({
      input: undefined,
      output: {
        toolCalls: [{ toolName: 'search', args: {} }],
        finalOutput: '',
        latencyMs: 0,
        adapterName: 'test',
      },
      expected: {},
      metadata: undefined,
    });
    expect(result.score).toBeNull();
  });

  it('has correct name and kind', () => {
    expect(evaluator.name).toBe('tool-sequence');
    expect(evaluator.kind).toBe('CODE');
  });
});
