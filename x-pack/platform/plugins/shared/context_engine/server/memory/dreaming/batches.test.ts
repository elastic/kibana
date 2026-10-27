/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredMemoryDocument } from '../memory_document';
import { buildDreamBatches, estimateTokens, fitToTokenBudget } from './batches';

const memory = (id: string, timestamp: string): StoredMemoryDocument =>
  ({ id, '@timestamp': timestamp, title: id } as StoredMemoryDocument);

/** Every memory costs 10 tokens. */
const format = () => 'x'.repeat(40);

describe('estimateTokens', () => {
  it('counts about four characters per token', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });
});

describe('buildDreamBatches', () => {
  it('returns no batches for no memories', () => {
    expect(buildDreamBatches({ memories: [], maxTokens: 100, format })).toEqual([]);
  });

  it('splits time-ordered memories by the token budget', () => {
    const batches = buildDreamBatches({
      memories: [
        memory('c', '2026-10-01T00:00:03.000Z'),
        memory('a', '2026-10-01T00:00:01.000Z'),
        memory('b', '2026-10-01T00:00:02.000Z'),
      ],
      maxTokens: 20,
      format,
    });

    expect(batches.map(({ memories, endsAt }) => [memories.map(({ id }) => id), endsAt])).toEqual([
      [['a', 'b'], '2026-10-01T00:00:02.000Z'],
      [['c'], '2026-10-01T00:00:03.000Z'],
    ]);
  });

  it('never ends a batch between memories with the same timestamp', () => {
    const batches = buildDreamBatches({
      memories: [
        memory('a', '2026-10-01T00:00:01.000Z'),
        memory('b', '2026-10-01T00:00:02.000Z'),
        memory('c', '2026-10-01T00:00:02.000Z'),
        memory('d', '2026-10-01T00:00:03.000Z'),
      ],
      maxTokens: 20,
      format,
    });

    expect(batches.map(({ memories }) => memories.map(({ id }) => id))).toEqual([
      ['a', 'b', 'c'],
      ['d'],
    ]);
  });

  it('puts a memory larger than the budget in a batch of its own', () => {
    const batches = buildDreamBatches({
      memories: [memory('a', '2026-10-01T00:00:01.000Z'), memory('b', '2026-10-01T00:00:02.000Z')],
      maxTokens: 5,
      format,
    });

    expect(batches).toHaveLength(2);
  });
});

describe('fitToTokenBudget', () => {
  it('keeps items in order until the budget runs out', () => {
    expect(fitToTokenBudget({ items: ['a', 'b', 'c'], maxTokens: 25, format })).toEqual(['a', 'b']);
  });
});
