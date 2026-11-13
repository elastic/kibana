/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceTranscriptMemory } from '../../common/step_types/read_trace_transcripts';
import { batchByConversation, estimateTokens, splitRound } from './trace_batches';

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

  it('splits a conversation larger than the budget between its rounds, and a round larger than it into parts', () => {
    const rounds = [
      round('a1', 'a', 60),
      round('a2', 'a', 60),
      round('a3', 'a', 30),
      {
        ...round('b1', 'b', 0),
        content: Array.from({ length: 10 }, (_, i) => `${i}`.repeat(150)).join('\n'),
      },
      round('c1', 'c', 10),
    ];
    const batches = batchByConversation(rounds, 100);

    const batchIds = ids(batches);

    const parts = batchIds.flat().filter((id) => id === 'b1').length;

    expect(batchIds.slice(0, 2)).toEqual([['a1'], ['a2', 'a3']]);
    expect(parts).toBeGreaterThan(1);
    expect(batchIds.flat()).toEqual(['a1', 'a2', 'a3', ...Array(parts).fill('b1'), 'c1']);
    expect(batches.flat().every((part) => estimateTokens(part) <= 100)).toBe(true);
  });

  it('splits a long round between lines, each part saying which it is and how the round began', () => {
    const lines = [
      'User: order a laptop',
      ...Array.from({ length: 30 }, (_, i) => `Tool result: page ${i} ${'x'.repeat(40)}`),
      'Assistant: done',
    ];
    const long = { ...round('r1', 'a', 0), content: lines.join('\n') };
    const parts = splitRound(long, 200);

    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every(({ id }) => id === 'r1')).toBe(true);
    expect(parts.every((part) => estimateTokens(part) <= 200)).toBe(true);
    expect(
      parts[0].content.startsWith(`[Part 1 of ${parts.length} of this round]\nUser: order a laptop`)
    ).toBe(true);
    expect(
      parts[1].content.startsWith(
        `[Part 2 of ${parts.length} of this round, which began: User: order a laptop]`
      )
    ).toBe(true);
    expect(parts.map(({ content }) => content.split('\n').slice(1).join('\n')).join('\n')).toBe(
      long.content
    );
    expect(splitRound(round('s', 'a', 10), 200)).toEqual([round('s', 'a', 10)]);
    expect(
      splitRound({ ...round('w', 'a', 0), content: 'y'.repeat(3000) }, 200)
        .map(({ content }) => content.split('\n')[1])
        .join('')
    ).toBe('y'.repeat(3000));
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
