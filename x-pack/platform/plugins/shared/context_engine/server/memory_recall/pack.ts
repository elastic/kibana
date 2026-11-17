/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RECALL_RESERVED_TOKENS } from '../../common/constants';
import type { RecallResult } from '../../common/http_api/memory_recall';
import type { RecallCandidate } from './types';

const CHARS_PER_TOKEN = 4;

export const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);

const keyOf = ({ source, session_id: sessionId, ai_index_id: aiIndexId, id }: RecallCandidate) =>
  [source, sessionId ?? aiIndexId ?? '', id].join(':');

/**
 * Fills the reserved space with the newest pinned memories, then adds ranked candidates in order.
 * A ranked candidate larger than the remaining budget is skipped and the next one is tried.
 */
export const packResults = ({
  pinned,
  ranked,
  maxTokens,
}: {
  pinned: RecallCandidate[];
  ranked: RecallCandidate[];
  maxTokens: number;
}): { results: RecallResult[]; tokens: number } => {
  const results: RecallResult[] = [];
  let tokens = 0;
  const newestFirst = [...pinned].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  for (const candidate of newestFirst) {
    const size = estimateTokens(candidate.content);
    if (tokens + size > RECALL_RESERVED_TOKENS) {
      break;
    }
    results.push({ ...candidate, reserved: true });
    tokens += size;
  }
  const reserved = new Set(results.map(keyOf));
  for (const candidate of ranked) {
    const size = estimateTokens(candidate.content);
    if (reserved.has(keyOf(candidate)) || tokens + size > maxTokens) {
      continue;
    }
    results.push({ ...candidate, reserved: false });
    tokens += size;
  }
  return { results, tokens };
};
