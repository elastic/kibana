/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  AI_INDEX_BUDGET_PATH,
  AI_INDEX_INTERNAL_API_VERSION,
  SPACE_BUDGETS_PATH,
} from '../../../common/constants';
import type {
  AiIndexBudget,
  AiIndexBudgetStatusResponse,
  PutAiIndexBudgetResponse,
  SpaceBudgetStatusResponse,
} from '../../../common/budgets';

/** Month-to-date spend against the AI index's and the space's limits. */
export const getAiIndexBudgetStatus = (
  http: HttpStart,
  { aiIndexId, signal }: { aiIndexId: string; signal?: AbortSignal }
): Promise<AiIndexBudgetStatusResponse> =>
  http.get<AiIndexBudgetStatusResponse>(buildPath(AI_INDEX_BUDGET_PATH, { aiIndexId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    ...(signal ? { signal } : {}),
  });

/** Replaces the AI index's budget block; omitted limits fall back to the space limits. */
export const putAiIndexBudget = (
  http: HttpStart,
  { aiIndexId, budget }: { aiIndexId: string; budget: AiIndexBudget }
): Promise<PutAiIndexBudgetResponse> =>
  http.put<PutAiIndexBudgetResponse>(buildPath(AI_INDEX_BUDGET_PATH, { aiIndexId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    body: JSON.stringify(budget),
  });

/** Month-to-date spend of the space and of each of its AI indices. */
export const getSpaceBudgetStatus = (
  http: HttpStart,
  { signal }: { signal?: AbortSignal } = {}
): Promise<SpaceBudgetStatusResponse> =>
  http.get<SpaceBudgetStatusResponse>(SPACE_BUDGETS_PATH, {
    version: AI_INDEX_INTERNAL_API_VERSION,
    ...(signal ? { signal } : {}),
  });
