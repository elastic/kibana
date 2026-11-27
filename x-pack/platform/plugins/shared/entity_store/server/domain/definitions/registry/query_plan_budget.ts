/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { MAX_QUERY_PLANS } from '../../../../common/domain/definitions/dynamic';
import type { DynamicSource } from '../../../../common/domain/definitions/dynamic';
import type { EntityDefinitionWithoutId } from '../../../../common/domain/definitions/entity_schema';
import { canonicalizeEsqlFilter } from '../canonical_filter';

const ENGINES_PER_PLAN_GROUP = 2;

const getPlanGroupKey = (filter: string | undefined): string | null => {
  if (filter === undefined) {
    return null;
  }
  const canonical = canonicalizeEsqlFilter(filter);
  return canonical.ok ? canonical.filter : filter;
};

const countPossibleQueryPlans = (sources: readonly DynamicSource[]): number =>
  sources.reduce((total, { metrics = [] }) => {
    const planGroups = new Set(metrics.map(({ filter }) => getPlanGroupKey(filter)));
    return total + Math.max(planGroups.size, 1) * ENGINES_PER_PLAN_GROUP;
  }, 0);

export const assertQueryPlanBudget = (
  definition: Pick<EntityDefinitionWithoutId, 'dynamic'>,
  ctx: z.RefinementCtx
): void => {
  const { dynamic } = definition;
  if (!dynamic) {
    return;
  }
  const possibleQueryPlans = countPossibleQueryPlans(dynamic.sources);
  if (possibleQueryPlans > MAX_QUERY_PLANS) {
    ctx.addIssue({
      code: 'custom',
      path: ['dynamic', 'sources'],
      message: `the sources can expand to ${possibleQueryPlans} query plans (one per distinct canonical metric filter per source, under TS and FROM); at most ${MAX_QUERY_PLANS} are allowed`,
    });
  }
};
