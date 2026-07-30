/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  RunBudgetGroupId,
  RunLimit,
  RunQuotaSettings,
  RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';
import { useKibana } from './use_kibana';
import { getFormattedError } from '../util/errors';

const RUN_QUOTAS_QUERY_KEY = ['significantEventsRunQuotas'] as const;

// Usage moves whenever a counted workflow runs, and the limits are
// deployment-wide, so refresh on the same cadence as the maintenance status.
const RUN_QUOTAS_REFETCH_INTERVAL_MS = 30_000;

const SAVE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.runQuotas.saveSuccessToastTitle',
  { defaultMessage: 'Updated daily run limits' }
);

const SAVE_SUCCESS_TOAST_TEXT = i18n.translate(
  'xpack.streams.significantEventsDiscovery.runQuotas.saveSuccessToastText',
  {
    defaultMessage:
      'New limits are applied to the automation workflows and take effect on their next run.',
  }
);

const SAVE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.runQuotas.saveErrorToastTitle',
  { defaultMessage: 'Failed to update daily run limits' }
);

/**
 * Daily run limits plus how much of the current window each budget group has
 * used. Deployment-wide, so it is cached under one shared key.
 */
export const useRunQuotas = () => {
  const {
    dependencies: {
      start: {
        significantEvents: { significantEventsRepositoryClient },
      },
    },
  } = useKibana();

  return useQuery<RunQuotasResponse, Error>({
    queryKey: RUN_QUOTAS_QUERY_KEY,
    queryFn: ({ signal }: QueryFunctionContext) =>
      significantEventsRepositoryClient.fetch('GET /internal/significant_events/run_quotas', {
        signal: signal ?? null,
      }),
    refetchInterval: RUN_QUOTAS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
};

export interface RunQuotasUpdate {
  timezone?: string;
  limits?: Partial<Record<RunBudgetGroupId, RunLimit>>;
}

/**
 * Saves the limits. The server reinstalls the counted workflows as part of the
 * write, because the limit lives in the workflow definition.
 */
export const useUpdateRunQuotas = () => {
  const {
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: {
        significantEvents: { significantEventsRepositoryClient },
      },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const mutation = useMutation<RunQuotaSettings, Error, RunQuotasUpdate>({
    mutationFn: (body) =>
      significantEventsRepositoryClient.fetch('PUT /internal/significant_events/run_quotas', {
        signal: null,
        params: { body },
      }),
    onSuccess: () => {
      toasts.addSuccess({ title: SAVE_SUCCESS_TOAST_TITLE, text: SAVE_SUCCESS_TOAST_TEXT });
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: SAVE_ERROR_TOAST_TITLE });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: RUN_QUOTAS_QUERY_KEY }),
  });

  return {
    save: (update: RunQuotasUpdate) => mutation.mutateAsync(update),
    isSaving: mutation.isLoading,
  };
};
