/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { AiIndexBudget, AiIndexBudgetStatusResponse } from '../../../common/budgets';
import { getAiIndexBudgetStatus, putAiIndexBudget } from '../api/budgets';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/** Spend reads are cached server-side for a minute, so refetching sooner shows nothing new. */
const BUDGET_STALE_TIME_MS = 60_000;

interface UseAiIndexBudgetResult {
  budget: AiIndexBudgetStatusResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/** Month-to-date spend of an AI index against its own and the space's limits. */
export const useAiIndexBudget = (aiIndexId: string | undefined): UseAiIndexBudgetResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error } = useQuery<AiIndexBudgetStatusResponse, Error>({
    queryKey: contextEngineQueryKeys.budgets.aiIndex(aiIndexId ?? ''),
    queryFn: ({ signal }) => getAiIndexBudgetStatus(http, { aiIndexId: aiIndexId ?? '', signal }),
    enabled: aiIndexId !== undefined,
    staleTime: BUDGET_STALE_TIME_MS,
  });

  return {
    budget: data,
    isLoading: aiIndexId !== undefined && isLoading,
    error: error ?? undefined,
  };
};

/** Persists the AI index's own limits and cost tier. */
export const useSaveAiIndexBudget = (aiIndexId: string) => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (budget: AiIndexBudget) => putAiIndexBudget(http, { aiIndexId, budget }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.budgets.all() }),
    onError: (error: Error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.saveError', {
          defaultMessage: 'Unable to update the budget',
        }),
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });
};
