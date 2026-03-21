/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hierarchicalMerge } from '../src/merge';

describe('hierarchicalMerge', () => {
  it('should merge 4 outputs in log(n) rounds', async () => {
    const outputs = ['A', 'B', 'C', 'D'];
    const mergeFn = async ([a, b]: [string, string]) => `${a}+${b}`;

    const result = await hierarchicalMerge(outputs, mergeFn);

    // Round 1: [A, B] -> A+B, [C, D] -> C+D
    // Round 2: [A+B, C+D] -> A+B+C+D
    expect(result).toBe('A+B+C+D');
  });

  it('should handle odd number of outputs', async () => {
    const outputs = ['A', 'B', 'C'];
    const mergeFn = async ([a, b]: [string, string]) => `${a}+${b}`;

    const result = await hierarchicalMerge(outputs, mergeFn);

    // Round 1: [A, B] -> A+B, [C] -> C (passes through)
    // Round 2: [A+B, C] -> A+B+C
    expect(result).toBe('A+B+C');
  });

  it('should return single output unchanged', async () => {
    const outputs = ['A'];
    const mergeFn = jest.fn();

    const result = await hierarchicalMerge(outputs, mergeFn);

    expect(result).toBe('A');
    expect(mergeFn).not.toHaveBeenCalled();
  });

  it('should call merge function correct number of times', async () => {
    const outputs = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let callCount = 0;
    const mergeFn = async ([a, b]: [string, string]) => {
      callCount++;
      return `${a}+${b}`;
    };

    await hierarchicalMerge(outputs, mergeFn);

    // 8 outputs: Round 1: 4 merges, Round 2: 2 merges, Round 3: 1 merge = 7 total
    expect(callCount).toBe(7);
  });

  it('should throw on empty array', async () => {
    await expect(hierarchicalMerge([], async ([a, b]) => `${a}+${b}`)).rejects.toThrow(
      'Cannot merge empty array'
    );
  });
});
