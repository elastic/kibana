/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_DREAMING_STEP_MEMORIES } from '../../common/dreaming';
import type { TraceTranscriptMemory } from '../../common/step_types/read_trace_transcripts';
import { batchByConversation, estimateTokens, refsOfBatches, splitRound } from './trace_batches';
import { DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS } from '../../common/step_types/read_trace_transcripts';

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

  it('caps a batch at the memories one dreaming step takes, however few tokens its rounds hold', () => {
    const long = Array.from({ length: MAX_DREAMING_STEP_MEMORIES + 50 }, (_, index) =>
      round(`a${index}`, 'a', 1)
    );
    const twoConversations = Array.from({ length: 300 }, (_, index) =>
      round(`b${index}`, `b${index % 2}`, 1)
    );

    expect(batchByConversation(long, 1_000_000).map((batch) => batch.length)).toEqual([
      MAX_DREAMING_STEP_MEMORIES,
      50,
    ]);
    expect(batchByConversation(twoConversations, 1_000_000).map((batch) => batch.length)).toEqual([
      150, 150,
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

describe('estimateTokens against the prompt the model reads', () => {
  const withContent = (content: string): TraceTranscriptMemory => ({
    ...round('r', 'c', 1),
    title: 'Agent conversation, round ending 2026-11-12T08:00:00.000Z',
    content,
  });
  const promptTokensAtLeast = (memory: TraceTranscriptMemory) =>
    Buffer.byteLength(JSON.stringify([memory.title, memory.content])) / 4;
  const samples: Record<string, string> = {
    english: 'User: How do I rotate the API keys of my deployment?\n'.repeat(400),
    'escape heavy': 'Tool result: {"a":"b\\n\\"c\\""}\n\t'.repeat(600),
    cjk: '用户：请帮我检查部署的索引生命周期策略。'.repeat(300),
    cyrillic: 'Пользователь: покажи ошибки за последний час.\n'.repeat(300),
    emoji: '🚀🔥✅ deploy done '.repeat(500),
  };

  it.each(Object.keys(samples))('does not underestimate %s text', (name) => {
    const memory = withContent(samples[name]);
    expect(estimateTokens(memory)).toBeGreaterThanOrEqual(
      Math.floor(promptTokensAtLeast(memory)) - 2
    );
  });

  it('counts escapes and non-ASCII characters at more than a quarter token', () => {
    expect(estimateTokens({ title: '', content: '\n\n\n\n' })).toBe(2);
    expect(estimateTokens({ title: '', content: '用户' })).toBe(2);
  });

  it.each(Object.keys(samples))(
    'keeps every batch of %s rounds within the default batch budget',
    (name) => {
      const rounds = Array.from({ length: 60 }, (_, i) => ({
        ...withContent(samples[name]),
        id: `r${i}`,
        attributes: { 'trace.conversation_id': `c${i % 3}` },
      }));
      const batches = batchByConversation(rounds, DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS);

      expect(batches.length).toBeGreaterThan(0);
      for (const batch of batches) {
        const tokens = batch.reduce((sum, memory) => sum + estimateTokens(memory), 0);
        expect(tokens).toBeLessThanOrEqual(DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS);
      }
    }
  );
});

describe('refsOfBatches', () => {
  const found = (id: string) => ({
    traceId: id,
    lastAt: '2026-11-12T08:00:00.000Z',
    target: 'traces',
  });

  it('references the rounds of each batch in order, without their transcripts', () => {
    const batches = batchByConversation(
      [round('trace:a', 'a', 60), round('trace:b', 'b', 60)],
      100
    );

    expect(refsOfBatches(batches, [found('a'), found('b')])).toEqual([
      [{ trace_id: 'a', last_at: '2026-11-12T08:00:00.000Z', target: 'traces' }],
      [{ trace_id: 'b', last_at: '2026-11-12T08:00:00.000Z', target: 'traces' }],
    ]);
  });

  it('names the parts of a round split across batches, so each batch loads its own', () => {
    const batches = batchByConversation(
      [round('trace:a', 'a', 60), round('trace:big', 'a', 250), round('trace:z', 'a', 10)],
      100
    );
    const refs = refsOfBatches(batches, [found('a'), found('big'), found('z')]);

    const partsOfBig = refs.flatMap((batch) =>
      batch.filter(({ trace_id: id }) => id === 'big').map(({ parts }) => parts)
    );
    expect(partsOfBig.length).toBeGreaterThan(1);
    expect(partsOfBig[0]).toEqual({ from: 0, to: expect.any(Number) });
    expect(partsOfBig.map((parts) => parts?.to)).toEqual(
      [...partsOfBig.map((parts) => parts?.to)].sort((a, b) => (a ?? 0) - (b ?? 0))
    );
    const covered = partsOfBig.reduce(
      (sum, parts) => sum + ((parts?.to ?? 0) - (parts?.from ?? 0)),
      0
    );
    expect(covered).toBe(batches.flat().filter(({ id }) => id === 'trace:big').length);
    expect(refs[0][0].parts).toBeUndefined();
  });
});
