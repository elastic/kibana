/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredMemoryDocument } from '../memory_document';

/** A rough token count: about four characters per token. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export interface DreamBatch {
  /** Oldest first. */
  memories: StoredMemoryDocument[];
  /** Timestamp of the newest memory; once the batch is applied, the type is done up to here. */
  endsAt: string;
}

const byTimestamp = (a: StoredMemoryDocument, b: StoredMemoryDocument) =>
  new Date(a['@timestamp']).getTime() - new Date(b['@timestamp']).getTime() ||
  a.id.localeCompare(b.id);

/**
 * Splits memories into time-ordered batches of at most `maxTokens` each. A batch never ends
 * between two memories with the same timestamp, so `endsAt` is always a safe place to resume.
 */
export const buildDreamBatches = ({
  memories,
  maxTokens,
  format,
}: {
  memories: StoredMemoryDocument[];
  maxTokens: number;
  format: (memory: StoredMemoryDocument) => string;
}): DreamBatch[] => {
  const batches: DreamBatch[] = [];
  let current: StoredMemoryDocument[] = [];
  let currentTokens = 0;

  for (const memory of [...memories].sort(byTimestamp)) {
    const tokens = estimateTokens(format(memory));
    const last = current[current.length - 1];
    if (
      last !== undefined &&
      currentTokens + tokens > maxTokens &&
      last['@timestamp'] !== memory['@timestamp']
    ) {
      batches.push({ memories: current, endsAt: last['@timestamp'] });
      current = [];
      currentTokens = 0;
    }
    current.push(memory);
    currentTokens += tokens;
  }

  const last = current[current.length - 1];
  if (last !== undefined) {
    batches.push({ memories: current, endsAt: last['@timestamp'] });
  }
  return batches;
};

/** Keeps items, in order, until the next one would go over `maxTokens`. */
export const fitToTokenBudget = <T>({
  items,
  maxTokens,
  format,
}: {
  items: T[];
  maxTokens: number;
  format: (item: T) => string;
}): T[] => {
  const kept: T[] = [];
  let tokens = 0;
  for (const item of items) {
    tokens += estimateTokens(format(item));
    if (tokens > maxTokens) {
      break;
    }
    kept.push(item);
  }
  return kept;
};
