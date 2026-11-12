/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceTranscriptMemory } from '../../common/step_types/read_trace_transcripts';
import { batchByConversation, estimateTokens } from './trace_batches';

/** A round of `tokens` estimated tokens: its title and content are 4 characters a token. */
const round = (
  id: string,
  conversation: string | undefined,
  tokens: number,
  space = 'default'
): TraceTranscriptMemory => ({
  id,
  type: 'trace.round',
  title: '',
  content: 'x'.repeat(tokens * 4),
  updated_at: '2026-11-12T08:00:00.000Z',
  attributes: { 'trace.id': id, ...(conversation && { 'trace.conversation_id': conversation }) },
  permissions: { kibana: { privileges: [{ space }] } },
});

const ids = (batches: TraceTranscriptMemory[][]) =>
  batches.map((batch) => batch.map(({ id }) => id));

describe('batchByConversation', () => {
  it('estimates a round at 4 characters a token', () => {
    expect(estimateTokens({ title: 'abcd', content: 'efgh1' })).toBe(3);
  });

  it("keeps each conversation's rounds together and in order, however the read interleaved them", () => {
    const rounds = [
      round('a1', 'a', 10),
      round('b1', 'b', 10),
      round('a2', 'a', 10),
      round('c1', 'c', 10),
      round('b2', 'b', 10),
    ];

    expect(ids(batchByConversation(rounds, 1000))).toEqual([['a1', 'a2', 'b1', 'b2', 'c1']]);
  });

  it('packs whole conversations up to the budget, starting a batch when the next does not fit', () => {
    const rounds = [
      round('a1', 'a', 30),
      round('a2', 'a', 30),
      round('b1', 'b', 30),
      round('c1', 'c', 30),
      round('c2', 'c', 20),
    ];

    expect(ids(batchByConversation(rounds, 100))).toEqual([
      ['a1', 'a2', 'b1'],
      ['c1', 'c2'],
    ]);
  });

  it('splits a conversation larger than the budget into consecutive parts, and a huge round stays alone', () => {
    const rounds = [
      round('a1', 'a', 60),
      round('a2', 'a', 60),
      round('a3', 'a', 30),
      round('b1', 'b', 500),
      round('c1', 'c', 10),
    ];

    expect(ids(batchByConversation(rounds, 100))).toEqual([['a1'], ['a2', 'a3'], ['b1'], ['c1']]);
  });

  it('never batches rounds with different permissions, and keeps rounds without a conversation apart', () => {
    const rounds = [
      round('a1', 'a', 10, 'team-a'),
      round('x', undefined, 10, 'team-a'),
      round('b1', 'b', 10, 'team-b'),
      round('a2', 'a', 10, 'team-a'),
    ];

    expect(ids(batchByConversation(rounds, 1000))).toEqual([['a1', 'a2', 'x'], ['b1']]);
    expect(batchByConversation([], 1000)).toEqual([]);
  });
});
