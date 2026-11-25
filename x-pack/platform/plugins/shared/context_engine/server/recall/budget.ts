/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_RECALL_FORMAT } from '../../common/constants';
import type { RecallFormat, RecallResult } from '../../common/http_api/recall';
import { normalizeRecallResult, recallContainerChars, serializedRecallItemChars } from './format';

/** V1 default: naive character-to-token ratio mirroring `server/dreaming/trace_batches.ts`. */
const CHARS_PER_TOKEN = 4;

const estimateTokens = (charLength: number): number => Math.ceil(charLength / CHARS_PER_TOKEN);

export interface PackedRecallResults {
  readonly results: RecallResult[];
  readonly tokensReturned: number;
}

/**
 * V1 default: packs whole results in reranked order without truncation, always keeping result #1
 * even when it exceeds `tokenBudget`, and stops on the first later result that overflows.
 */
export const packRecallResults = ({
  results,
  tokenBudget,
  format = DEFAULT_RECALL_FORMAT,
}: {
  results: readonly RecallResult[];
  tokenBudget: number;
  format?: RecallFormat;
}): PackedRecallResults => {
  const [first, ...rest] = results;
  if (!first) {
    return { results: [], tokensReturned: 0 };
  }
  const { wrapper, separator } = recallContainerChars[format];
  const firstNormalized = normalizeRecallResult(first);
  const packed: RecallResult[] = [firstNormalized];
  let totalChars = wrapper + serializedRecallItemChars(firstNormalized, format);

  for (const result of rest) {
    const normalized = normalizeRecallResult(result);
    const nextChars = totalChars + separator + serializedRecallItemChars(normalized, format);
    if (estimateTokens(nextChars) > tokenBudget) {
      break;
    }
    packed.push(normalized);
    totalChars = nextChars;
  }
  return { results: packed, tokensReturned: estimateTokens(totalChars) };
};
