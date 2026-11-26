/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TokenTotals {
  input_tokens: number;
  output_tokens: number;
  /** Subset of `input_tokens` served from the provider cache. */
  cached_tokens: number;
}

/** AI spend of the automation workflows attached to AI indices. */
export interface SpendTotals {
  tokens: TokenTotals;
  /** Estimated cost of the tokens that could be priced. */
  cost_usd: number;
  /** Tokens from models with no known price (custom connectors, self-hosted models). */
  unpriced_tokens: number;
}

export interface SpendPeriod {
  /** Inclusive start of the current calendar month (UTC). */
  start: string;
  /** Exclusive end of the current calendar month (UTC). */
  end: string;
}

export interface PricingInfo {
  source: 'elastic_price_catalog' | 'unavailable';
  fetched_at?: string;
  /** The catalog could not be refreshed and an older copy is in use. */
  stale?: boolean;
}

export interface AiIndexSpendResponse {
  ai_index_id: string;
  period: SpendPeriod;
  pricing: PricingInfo;
  ai_index: SpendTotals;
  space: SpendTotals;
}

export interface SpaceSpendResponse {
  period: SpendPeriod;
  pricing: PricingInfo;
  space: SpendTotals;
  ai_indices: Array<{ id: string; spend: SpendTotals }>;
}

/** The calendar month (UTC) containing `now`. */
export const getSpendPeriod = (now: Date): SpendPeriod => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
};
