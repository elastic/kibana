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
  RunQuotaSettingsUpdate,
  RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';
import { useKibana } from './use_kibana';

const RUN_QUOTAS_QUERY_KEY = ['significantEventsRunQuotas'] as const;

export const useRunQuotas = () => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;

  return useQuery<RunQuotasResponse, Error>({
    queryKey: RUN_QUOTAS_QUERY_KEY,
    queryFn: ({ signal }: QueryFunctionContext) =>
      significantEventsRepositoryClient.fetch('GET /internal/significant_events/run_quotas', {
        signal: signal ?? null,
      }),
    refetchOnWindowFocus: true,
  });
};

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
  const mutation = useMutation<RunQuotasResponse, Error, RunQuotaSettingsUpdate>({
    mutationFn: (body) =>
      significantEventsRepositoryClient.fetch('PUT /internal/significant_events/run_quotas', {
        signal: null,
        params: { body },
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(RUN_QUOTAS_QUERY_KEY, response);
      toasts.addSuccess({
        title: i18n.translate('xpack.significantEventsApp.runQuotas.saveSuccessToastTitle', {
          defaultMessage: 'Updated daily run limits',
        }),
      });
      return queryClient.invalidateQueries({ queryKey: RUN_QUOTAS_QUERY_KEY });
    },
  });

  return {
    save: (update: RunQuotaSettingsUpdate) => mutation.mutateAsync(update),
    isSaving: mutation.isLoading,
  };
};
