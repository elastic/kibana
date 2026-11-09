/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { harnessPaths } from './workspace';

export interface ModelPrice {
  /** USD per million input tokens. */
  input: number;
  /** USD per million output tokens. */
  output: number;
}

/**
 * Approximate list prices per model, USD per million tokens.
 *
 * Token counts stop being comparable the moment the model slot is open — a candidate that halves
 * its tokens on a model that costs five times more is more expensive, not cheaper — so the gate
 * prices tokens instead of counting them.
 *
 * These are *placeholders*, not EIS billing data. Override them with a `prices.json` in the
 * harness directory (same shape, keyed by the same substrings) before trusting a cost-path
 * acceptance.
 */
export const DEFAULT_PRICES: Record<string, ModelPrice> = {
  'gemini-3.5-flash-lite': { input: 0.1, output: 0.4 },
  'gemini-3.8-flash': { input: 0.3, output: 2.5 },
  'gpt-5.4-mini': { input: 0.25, output: 2.0 },
  'gpt-5.4': { input: 1.25, output: 10.0 },
  'claude-5.5-haiku': { input: 1.0, output: 5.0 },
  'claude-5.5-sonnet': { input: 3.0, output: 15.0 },
};

/** Rate used when a run's model is unknown, so an unpriced model is never silently free. */
export const FALLBACK_PRICE: ModelPrice = { input: 1.0, output: 5.0 };

let cached: Record<string, ModelPrice> | undefined;

export const loadPrices = (): Record<string, ModelPrice> => {
  if (cached) return cached;
  const path = Path.join(harnessPaths().root, 'prices.json');
  cached = Fs.existsSync(path)
    ? { ...DEFAULT_PRICES, ...(JSON.parse(Fs.readFileSync(path, 'utf8')) as typeof DEFAULT_PRICES) }
    : DEFAULT_PRICES;
  return cached;
};

/** Longest matching key wins, so `gpt-5.4-mini` is not priced as `gpt-5.4`. */
export const priceFor = (modelOrConnectorId: string | undefined): ModelPrice => {
  if (!modelOrConnectorId) return FALLBACK_PRICE;
  const prices = loadPrices();
  const match = Object.keys(prices)
    .filter((key) => modelOrConnectorId.includes(key))
    .sort((a, b) => b.length - a.length)[0];
  return match ? prices[match] : FALLBACK_PRICE;
};

export const costUsd = ({
  modelOrConnectorId,
  inputTokens = 0,
  outputTokens = 0,
}: {
  modelOrConnectorId?: string;
  inputTokens?: number;
  outputTokens?: number;
}): number => {
  const price = priceFor(modelOrConnectorId);
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
};
