/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelPrice } from './price_catalog';

const TOKENS_PER_PRICE_UNIT = 1_000_000;
const ENDPOINT_TASK_SUFFIX = /-(chat_completion|completion)$/;

/**
 * Maps an Elastic Inference Service connector id to its price catalog slug:
 * `.anthropic-claude-4.5-haiku-chat_completion` → `anthropic-claude-4-5-haiku`.
 * Preconfigured EIS connectors are the only dot-prefixed ones, so any other id has no list price.
 */
export const toPriceKey = (connectorId: string | undefined): string | undefined => {
  if (!connectorId?.startsWith('.')) {
    return undefined;
  }
  const slug = connectorId
    .slice(1)
    .replace(ENDPOINT_TASK_SUFFIX, '')
    .replace(/[._]/g, '-')
    .toLowerCase();
  return slug.length > 0 ? slug : undefined;
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  /** Subset of `inputTokens`. */
  cachedTokens: number;
}

/** Cost in USD; cached input is billed at the cache-read price when the model has one. */
export const priceTokenUsage = (
  { inputTokens, outputTokens, cachedTokens }: TokenUsage,
  price: ModelPrice
): number => {
  const cached = Math.min(cachedTokens, inputTokens);
  const uncachedInput = inputTokens - cached;
  const cachedPrice = price.cacheRead ?? price.input;
  return (
    (uncachedInput * price.input + cached * cachedPrice + outputTokens * price.output) /
    TOKENS_PER_PRICE_UNIT
  );
};
