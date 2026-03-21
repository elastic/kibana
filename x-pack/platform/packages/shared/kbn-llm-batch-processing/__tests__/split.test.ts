/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tokenBasedSplit, itemBasedSplit } from '../src/split';

describe('tokenBasedSplit', () => {
  it('should split items to stay under max tokens per batch', () => {
    const items = ['a', 'bb', 'ccc', 'dddd', 'eeeee'];
    const estimator = (item: string) => item.length;
    const maxTokens = 5;

    const batches = tokenBasedSplit(items, maxTokens, estimator);

    expect(batches).toEqual([
      ['a', 'bb'], // 1 + 2 = 3 tokens
      ['ccc'], // 3 tokens
      ['dddd'], // 4 tokens
      ['eeeee'], // 5 tokens
    ]);
  });

  it('should handle single large item exceeding max', () => {
    const items = ['xxxxxx'];
    const estimator = (item: string) => item.length;
    const maxTokens = 3;

    const batches = tokenBasedSplit(items, maxTokens, estimator);

    expect(batches).toEqual([['xxxxxx']]); // Allow oversized batch
  });

  it('should return empty array for empty input', () => {
    const batches = tokenBasedSplit([], 100, () => 1);
    expect(batches).toEqual([]);
  });
});

describe('itemBasedSplit', () => {
  it('should split into batches of fixed size', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const batches = itemBasedSplit(items, 3);

    expect(batches).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('should handle exact divisions', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const batches = itemBasedSplit(items, 2);

    expect(batches).toEqual([[1, 2], [3, 4], [5, 6]]);
  });

  it('should return empty array for empty input', () => {
    const batches = itemBasedSplit([], 10);
    expect(batches).toEqual([]);
  });
});
