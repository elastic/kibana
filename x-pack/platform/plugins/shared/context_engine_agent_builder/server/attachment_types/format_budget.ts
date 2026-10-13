/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AiIndexBudgetStatusResponse,
  BucketBudgetStatus,
} from '@kbn/context-engine-plugin/common/budgets';

const usd = (amount: number): string => `$${amount.toFixed(2)}`;

const remaining = ({ limit_usd: limitUsd, spend }: BucketBudgetStatus): number | undefined =>
  limitUsd === undefined ? undefined : Math.max(0, limitUsd - spend.cost_usd);

const formatScope = (scope: string, status: BucketBudgetStatus): string =>
  status.limit_usd === undefined
    ? `${scope}: ${usd(status.spend.cost_usd)} spent, no limit`
    : `${scope}: ${usd(status.spend.cost_usd)} of ${usd(status.limit_usd)} spent`;

const formatBucket = (
  label: string,
  aiIndex: BucketBudgetStatus,
  space: BucketBudgetStatus
): string => {
  const left = [remaining(aiIndex), remaining(space)].filter(
    (value): value is number => value !== undefined
  );
  const summary = left.length === 0 ? 'unlimited' : `${usd(Math.min(...left))} left this month`;
  return `- ${label}: ${summary} (${formatScope('this index', aiIndex)}; ${formatScope(
    'space',
    space
  )})`;
};

/** Budget section of the `ai_index` attachment: the cost tier and what is left to spend. */
export const formatBudget = (status: AiIndexBudgetStatusResponse): string => {
  const lines = [
    `Cost tier: ${status.cost_tier}`,
    `Budgets (month to date, reset ${status.period.end.slice(0, 10)}):`,
    formatBucket('Automation runs', status.ai_index.automations, status.space.automations),
    formatBucket('Automation suggestions', status.ai_index.suggestions, status.space.suggestions),
  ];
  if (status.pricing.source === 'unavailable') {
    lines.push(
      'Model prices are unavailable, so spend cannot be estimated and limits are not enforced.'
    );
  }
  return lines.join('\n');
};
