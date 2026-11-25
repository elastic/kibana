/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRACE_ROUND_ID_PREFIX } from './ids';
import { MAX_DREAMING_STEP_MEMORIES } from '../../common/dreaming';
import type {
  TraceRoundRef,
  TraceTranscriptMemory,
} from '../../common/step_types/read_trace_transcripts';

const CHARS_PER_TOKEN = 4;

/**
 * Estimates the tokens a round takes in the model prompt, which carries it as JSON: characters
 * count as they are escaped there, a quarter token each, and a non-ASCII character counts as a
 * whole token, as scripts such as CJK and emoji tokenize far denser than English text.
 */
export const estimateTokens = (round: Pick<TraceTranscriptMemory, 'title' | 'content'>) =>
  Math.ceil(estimateExactTokens(round));

const estimateExactTokens = ({
  title,
  content,
}: Pick<TraceTranscriptMemory, 'title' | 'content'>) => {
  const escaped = JSON.stringify(title + content);
  let ascii = 0;
  let wide = 0;
  for (let i = 1; i < escaped.length - 1; i++) {
    if (escaped.charCodeAt(i) < 128) {
      ascii++;
    } else {
      wide++;
    }
  }
  return ascii / CHARS_PER_TOKEN + wide;
};

const groupInOrder = <T>(items: T[], keyOf: (item: T) => string): T[][] => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()];
};

const PART_OPENING_CHARS = 300;
const PART_HEADER_CHARS = 64;

/**
 * Splits a round's transcript into parts that each fit `batchTokens` and keep the round's id.
 * Parts after the first open with how the round began.
 */
export const splitRound = (
  round: TraceTranscriptMemory,
  batchTokens: number
): TraceTranscriptMemory[] => {
  if (estimateTokens(round) <= batchTokens) {
    return [round];
  }
  const charsPerToken = Math.min(
    CHARS_PER_TOKEN,
    (round.title.length + round.content.length) / estimateExactTokens(round)
  );
  const budget = Math.floor(batchTokens * charsPerToken) - round.title.length;
  const lines = round.content.split('\n');
  const opening = lines[0].slice(0, Math.min(PART_OPENING_CHARS, Math.floor(budget / 4)));
  const partChars = Math.max(1, budget - opening.length - PART_HEADER_CHARS);

  const parts: string[][] = [];
  let part: string[] = [];
  let size = 0;
  const add = (piece: string) => {
    if (part.length > 0 && size + piece.length + 1 > partChars) {
      parts.push(part);
      part = [];
      size = 0;
    }
    part.push(piece);
    size += piece.length + 1;
  };
  for (const line of lines) {
    if (line.length <= partChars) {
      add(line);
      continue;
    }
    for (let start = 0; start < line.length; start += partChars) {
      add(line.slice(start, start + partChars));
    }
  }
  parts.push(part);

  return parts.map((partLines, index) => ({
    ...round,
    content: [
      `[Part ${index + 1} of ${parts.length} of this round${
        index > 0 ? `, which began: ${opening}` : ''
      }]`,
      ...partLines,
    ].join('\n'),
  }));
};

const conversationOf = (round: TraceTranscriptMemory): string => {
  const conversationId = round.attributes?.['trace.conversation_id'];
  return typeof conversationId === 'string' ? conversationId : round.id;
};

/**
 * Batches rounds that share permissions for the dreaming model, packing whole conversations in
 * order up to `batchTokens` and `MAX_DREAMING_STEP_MEMORIES` rounds, and splitting larger ones
 * between rounds or into parts.
 */
export const batchByConversation = (
  rounds: TraceTranscriptMemory[],
  batchTokens: number
): TraceTranscriptMemory[][] => {
  const batches: TraceTranscriptMemory[][] = [];
  for (const audience of groupInOrder(rounds, ({ permissions }) => JSON.stringify(permissions))) {
    let batch: TraceTranscriptMemory[] = [];
    let tokens = 0;
    const flush = () => {
      if (batch.length > 0) {
        batches.push(batch);
      }
      batch = [];
      tokens = 0;
    };
    for (const conversationRounds of groupInOrder(audience, conversationOf)) {
      const conversation = conversationRounds.flatMap((round) => splitRound(round, batchTokens));
      const conversationTokens = conversation.reduce(
        (sum, round) => sum + estimateTokens(round),
        0
      );
      if (
        tokens + conversationTokens <= batchTokens &&
        batch.length + conversation.length <= MAX_DREAMING_STEP_MEMORIES
      ) {
        batch.push(...conversation);
        tokens += conversationTokens;
        continue;
      }
      flush();
      for (const round of conversation) {
        const roundTokens = estimateTokens(round);
        if (
          batch.length > 0 &&
          (tokens + roundTokens > batchTokens || batch.length >= MAX_DREAMING_STEP_MEMORIES)
        ) {
          flush();
        }
        batch.push(round);
        tokens += roundTokens;
      }
    }
    flush();
  }
  return batches;
};

/**
 * The boundaries of batches made by {@link batchByConversation}, as references: each round with
 * where it was found, and for a round split across batches, which of its parts the batch holds.
 * `rounds` are the rounds the batched memories were read from.
 */
export const refsOfBatches = (
  batches: TraceTranscriptMemory[][],
  rounds: Array<{ traceId: string; lastAt: string; target: string }>
): TraceRoundRef[][] => {
  const byId = new Map(rounds.map((round) => [`${TRACE_ROUND_ID_PREFIX}${round.traceId}`, round]));
  const partsOf = new Map<string, number>();
  for (const { id } of batches.flat()) {
    partsOf.set(id, (partsOf.get(id) ?? 0) + 1);
  }
  const nextPart = new Map<string, number>();
  return batches.map((batch) => {
    const refs: TraceRoundRef[] = [];
    const indexOf = new Map<string, number>();
    for (const { id } of batch) {
      const round = byId.get(id);
      if (!round) {
        continue;
      }
      const part = nextPart.get(id) ?? 0;
      nextPart.set(id, part + 1);
      const existing = indexOf.get(id);
      if (existing !== undefined) {
        refs[existing].parts = { from: refs[existing].parts?.from ?? part, to: part + 1 };
        continue;
      }
      indexOf.set(id, refs.length);
      refs.push({
        trace_id: round.traceId,
        last_at: round.lastAt,
        target: round.target,
        ...((partsOf.get(id) ?? 1) > 1 && { parts: { from: part, to: part + 1 } }),
      });
    }
    return refs;
  });
};
