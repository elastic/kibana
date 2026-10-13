/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Spend buckets. `suggestions` covers the agent conversations that design automations;
 * `automations` covers the workflow runs that generate and maintain Knowledge Indicators.
 */
export const BUDGET_BUCKETS = ['suggestions', 'automations'] as const;
export type BudgetBucket = (typeof BUDGET_BUCKETS)[number];

/**
 * How much an AI index may spend per unit of work. The tier steers what the setup agent
 * builds (model, schedule, how much of the corpus each run touches), not enforcement.
 */
export const COST_TIERS = ['cheap', 'medium', 'expensive'] as const;
export type CostTier = (typeof COST_TIERS)[number];
export const DEFAULT_COST_TIER: CostTier = 'medium';

/** Share of a limit at which a bucket starts warning. */
export const BUDGET_WARNING_RATIO = 0.8;

/** Upper bound for any configured monthly limit, in USD. */
export const MAX_MONTHLY_BUDGET_USD = 1_000_000;

/** Per-AI-index budget configuration. Absent limits fall back to the space-level setting. */
export interface AiIndexBudget {
  suggestions_monthly_usd?: number;
  automations_monthly_usd?: number;
  cost_tier?: CostTier;
}

export interface TokenTotals {
  input_tokens: number;
  output_tokens: number;
  /** Subset of `input_tokens` served from the provider cache. */
  cached_tokens: number;
}

export interface BucketSpend {
  tokens: TokenTotals;
  /** Estimated cost of the tokens that could be priced. */
  cost_usd: number;
  /** Tokens from models with no known price (custom connectors, self-hosted models). */
  unpriced_tokens: number;
}

/**
 * - `unlimited`: no limit configured at this scope.
 * - `ok` / `warning`: under the limit; `warning` from {@link BUDGET_WARNING_RATIO}.
 * - `exhausted`: at or over the limit; new runs in this bucket are paused.
 */
export type BudgetState = 'unlimited' | 'ok' | 'warning' | 'exhausted';

export interface BucketBudgetStatus {
  limit_usd?: number;
  spend: BucketSpend;
  state: BudgetState;
}

export type BucketStatuses = Record<BudgetBucket, BucketBudgetStatus>;

export interface BudgetPeriod {
  /** Inclusive start of the current calendar month (UTC). */
  start: string;
  /** Exclusive end, when the budget resets. */
  end: string;
}

export interface PricingInfo {
  source: 'elastic_price_catalog' | 'unavailable';
  fetched_at?: string;
  /** The catalog could not be refreshed and an older copy is in use. */
  stale?: boolean;
}

export interface AiIndexBudgetStatusResponse {
  ai_index_id: string;
  period: BudgetPeriod;
  pricing: PricingInfo;
  config: AiIndexBudget;
  cost_tier: CostTier;
  ai_index: BucketStatuses;
  space: BucketStatuses;
}

export interface SpaceBudgetStatusResponse {
  period: BudgetPeriod;
  pricing: PricingInfo;
  space: BucketStatuses;
  ai_indices: Array<{ id: string; buckets: BucketStatuses }>;
}

export type PutAiIndexBudgetRequest = AiIndexBudget;

export interface PutAiIndexBudgetResponse {
  budget: AiIndexBudget;
}

/** Classifies spend against a limit. A missing or zero limit means no limit. */
export const getBudgetState = (costUsd: number, limitUsd: number | undefined): BudgetState => {
  if (limitUsd === undefined || limitUsd <= 0) {
    return 'unlimited';
  }
  if (costUsd >= limitUsd) {
    return 'exhausted';
  }
  return costUsd >= limitUsd * BUDGET_WARNING_RATIO ? 'warning' : 'ok';
};

/** The calendar month (UTC) containing `now`. */
export const getBudgetPeriod = (now: Date): BudgetPeriod => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
};
