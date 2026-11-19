/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecallResult } from '../../common/http_api/memory_recall';
import { estimateTokens, packResults } from './pack';

const result = (id: string, content: string): RecallResult => ({
  id,
  source: 'session_events',
  content,
});

describe('packResults', () => {
  it('adds candidates in rank order', () => {
    const { results, tokens } = packResults({
      ranked: [result('a', 'x'.repeat(40)), result('b', 'x'.repeat(40))],
      maxTokens: 1000,
    });

    expect(results.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(tokens).toBe(20);
  });

  it('skips a candidate larger than the remaining budget', () => {
    const { results, tokens } = packResults({
      ranked: [
        result('a', 'x'.repeat(40)),
        result('b', 'x'.repeat(80)),
        result('c', 'x'.repeat(40)),
      ],
      maxTokens: 25,
    });

    expect(results.map(({ id }) => id)).toEqual(['a', 'c']);
    expect(tokens).toBe(20);
  });

  it('truncates a candidate larger than the whole budget', () => {
    const { results, tokens } = packResults({
      ranked: [result('a', 'x'.repeat(5000))],
      maxTokens: 1000,
    });

    expect(results[0].content).toHaveLength(4000);
    expect(tokens).toBe(1000);
  });
});

describe('estimateTokens', () => {
  it('counts four characters per token', () => {
    expect(estimateTokens('x'.repeat(9))).toBe(3);
  });
});
