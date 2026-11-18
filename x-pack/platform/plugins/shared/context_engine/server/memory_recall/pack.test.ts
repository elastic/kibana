/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RECALL_RESERVED_TOKENS } from '../../common/constants';
import { estimateTokens, packResults } from './pack';
import type { RecallCandidate } from './types';

const memory = (id: string, content: string, date?: string): RecallCandidate => ({
  id,
  source: 'session_memory',
  session_id: 's1',
  content,
  ...(date && { date }),
});

describe('packResults', () => {
  it('returns pinned memories first, newest first', () => {
    const { results } = packResults({
      pinned: [memory('old', 'older', '2026-11-01'), memory('new', 'newer', '2026-11-05')],
      ranked: [memory('ranked', 'ranked')],
      maxTokens: 1000,
    });

    expect(results.map(({ id, reserved }) => [id, reserved])).toEqual([
      ['new', true],
      ['old', true],
      ['ranked', false],
    ]);
  });

  it('keeps the newest pinned memories within the reserved space', () => {
    const large = 'x'.repeat(RECALL_RESERVED_TOKENS * 3);
    const { results } = packResults({
      pinned: [memory('old', large, '2026-11-01'), memory('new', large, '2026-11-05')],
      ranked: [],
      maxTokens: 6000,
    });

    expect(results.map(({ id }) => id)).toEqual(['new']);
  });

  it('skips a ranked candidate larger than the remaining budget', () => {
    const { results, tokens } = packResults({
      pinned: [],
      ranked: [
        memory('a', 'x'.repeat(40)),
        memory('b', 'x'.repeat(400)),
        memory('c', 'x'.repeat(40)),
      ],
      maxTokens: 25,
    });

    expect(results.map(({ id }) => id)).toEqual(['a', 'c']);
    expect(tokens).toBe(20);
  });

  it('returns a pinned memory once', () => {
    const pinned = memory('pin', 'always answer in bullet points', '2026-11-05');
    const { results } = packResults({ pinned: [pinned], ranked: [pinned], maxTokens: 1000 });

    expect(results).toEqual([{ ...pinned, reserved: true }]);
  });
});

describe('estimateTokens', () => {
  it('counts four characters per token', () => {
    expect(estimateTokens('x'.repeat(9))).toBe(3);
  });
});
