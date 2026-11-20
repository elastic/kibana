/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecallResult } from '../../common/http_api/memory_recall';

const CHARS_PER_TOKEN = 4;

export const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);

/**
 * Adds ranked candidates in order up to `maxTokens`. A candidate larger than the whole budget is
 * truncated to it; one larger than the remaining budget is skipped and the next one is tried.
 */
export const packResults = ({
  ranked,
  maxTokens,
}: {
  ranked: RecallResult[];
  maxTokens: number;
}): { results: RecallResult[]; tokens: number } => {
  const results: RecallResult[] = [];
  let tokens = 0;
  for (const candidate of ranked) {
    const content = candidate.content.slice(0, maxTokens * CHARS_PER_TOKEN);
    const size = estimateTokens(content);
    if (tokens + size > maxTokens) {
      continue;
    }
    results.push({ ...candidate, content });
    tokens += size;
  }
  return { results, tokens };
};
