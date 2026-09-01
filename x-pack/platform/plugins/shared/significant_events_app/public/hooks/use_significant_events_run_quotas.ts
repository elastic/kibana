/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  RunQuotaEnforcementUpdate,
  RunQuotaLimitsUpdate,
  RunQuotaSkippedResponse,
  RunQuotaStatusResponse,
  RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';
import { getFormattedError } from '../util/errors';
import { useKibana } from './use_kibana';

const RUN_QUOTAS_QUERY_KEY = ['significantEventsRunQuotas'] as const;
const RUN_QUOTA_STATUS_QUERY_KEY = ['significantEventsRunQuotaStatus'] as const;
const RUN_QUOTAS_REFETCH_INTERVAL_MS = 30_000;

export const useRunQuotas = () => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;

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

export const useRunQuotaStatus = () => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;

  return useQuery<RunQuotaStatusResponse, Error>({
    queryKey: RUN_QUOTA_STATUS_QUERY_KEY,
    queryFn: async ({ signal }: QueryFunctionContext) =>
      (await significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/run_quotas/_status',
        {
          signal: signal ?? null,
        }
      )) as RunQuotaStatusResponse,
    refetchInterval: RUN_QUOTAS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
};

const useRunQuotaMutationCallbacks = () => {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  return {
    onSuccess: () => {
      toasts.addSuccess({
        title: i18n.translate('xpack.significantEventsApp.runQuotas.saveSuccessToastTitle', {
          defaultMessage: 'Updated daily run limits',
        }),
      });
    },
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.significantEventsApp.runQuotas.saveErrorToastTitle', {
          defaultMessage: 'Failed to update daily run limits',
        }),
      });
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: RUN_QUOTAS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: RUN_QUOTA_STATUS_QUERY_KEY }),
      ]),
  };
};

export const useUpdateRunQuotas = () => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;
  const callbacks = useRunQuotaMutationCallbacks();
  const mutation = useMutation<void, Error, RunQuotaLimitsUpdate>({
    mutationFn: (body) =>
      significantEventsRepositoryClient.fetch('PUT /internal/significant_events/run_quotas', {
        signal: null,
        params: { body },
      }),
    ...callbacks,
  });

  return {
    save: (update: RunQuotaLimitsUpdate) => mutation.mutateAsync(update),
    isSaving: mutation.isLoading,
  };
};

export const useUpdateRunQuotaEnforcement = () => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;
  const callbacks = useRunQuotaMutationCallbacks();
  const mutation = useMutation<{ enabled: boolean }, Error, RunQuotaEnforcementUpdate>({
    mutationFn: (body) =>
      significantEventsRepositoryClient.fetch(
        'POST /internal/significant_events/run_quotas/_enforcement',
        {
          signal: null,
          params: { body },
        }
      ),
    ...callbacks,
  });

  return {
    updateEnforcement: (update: RunQuotaEnforcementUpdate) => mutation.mutateAsync(update),
    isUpdating: mutation.isLoading,
  };
};

export const useSkippedRunQuotaInvestigations = ({
  date,
  enabled,
}: {
  date: string;
  enabled: boolean;
}) => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;

  return useQuery<RunQuotaSkippedResponse, Error>({
    queryKey: ['significantEventsRunQuotaSkipped', date],
    queryFn: ({ signal }: QueryFunctionContext) =>
      significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/run_quotas/_skipped',
        {
          signal: signal ?? null,
          params: { query: { date } },
        }
      ),
    enabled,
  });
};
