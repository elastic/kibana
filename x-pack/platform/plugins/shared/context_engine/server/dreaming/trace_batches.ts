/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceTranscriptMemory } from '../../common/step_types/read_trace_transcripts';

/** A rough count of the tokens a text costs a model: English averages about 4 characters each. */
const CHARS_PER_TOKEN = 4;

export const estimateTokens = ({
  title,
  content,
}: Pick<TraceTranscriptMemory, 'title' | 'content'>) =>
  Math.ceil((title.length + content.length) / CHARS_PER_TOKEN);

const groupInOrder = <T>(items: T[], keyOf: (item: T) => string): T[][] => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()];
};

const conversationOf = (round: TraceTranscriptMemory): string => {
  const conversationId = round.attributes?.['trace.conversation_id'];
  return typeof conversationId === 'string' ? conversationId : round.id;
};

/**
 * Batches rounds for the dreaming model, a model call each: rounds that share permissions, each
 * conversation's rounds together and in order, whole conversations packed up to `batchTokens`. A
 * conversation larger than that is split into consecutive parts; a round larger than it is a batch
 * of its own.
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
    for (const conversation of groupInOrder(audience, conversationOf)) {
      const conversationTokens = conversation.reduce(
        (sum, round) => sum + estimateTokens(round),
        0
      );
      if (tokens + conversationTokens <= batchTokens) {
        batch.push(...conversation);
        tokens += conversationTokens;
        continue;
      }
      flush();
      for (const round of conversation) {
        const roundTokens = estimateTokens(round);
        if (batch.length > 0 && tokens + roundTokens > batchTokens) {
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
