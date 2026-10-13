/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  AiIndexBudgetStatusResponse,
  BucketBudgetStatus,
  BudgetBucket,
  BudgetState,
} from '../../../common/budgets';

const STATE_SEVERITY: Record<BudgetState, number> = {
  unlimited: 0,
  ok: 1,
  warning: 2,
  exhausted: 3,
};

const spentRatio = ({ limit_usd: limitUsd, spend }: BucketBudgetStatus): number =>
  limitUsd === undefined ? -1 : spend.cost_usd / limitUsd;

/** The limit closer to being spent; `undefined` when neither scope has one. */
export const getGoverningLimit = (
  aiIndex: BucketBudgetStatus,
  space: BucketBudgetStatus
): BucketBudgetStatus | undefined => {
  const governing = spentRatio(aiIndex) >= spentRatio(space) ? aiIndex : space;
  return governing.limit_usd === undefined ? undefined : governing;
};

/** The state that governs a bucket: new work stops when either the index or the space limit is spent. */
export const getEffectiveBudgetState = (
  aiIndex: BucketBudgetStatus,
  space: BucketBudgetStatus
): BudgetState =>
  STATE_SEVERITY[aiIndex.state] >= STATE_SEVERITY[space.state] ? aiIndex.state : space.state;

export const getBucketState = (
  status: AiIndexBudgetStatusResponse,
  bucket: BudgetBucket
): BudgetState => getEffectiveBudgetState(status.ai_index[bucket], status.space[bucket]);

export const formatUsd = (amount: number): string =>
  new Intl.NumberFormat(i18n.getLocale(), { style: 'currency', currency: 'USD' }).format(amount);

export const formatTokens = (tokens: number): string =>
  new Intl.NumberFormat(i18n.getLocale(), { notation: 'compact' }).format(tokens);

/** Calendar date of the reset, from the exclusive end of the budget period. */
export const formatResetDate = (periodEnd: string): string =>
  new Intl.DateTimeFormat(i18n.getLocale(), { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(periodEnd)
  );
