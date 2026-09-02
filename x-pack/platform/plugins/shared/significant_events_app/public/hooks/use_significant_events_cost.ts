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
  SetTokenUsageTrackingResponse,
  SignificantEventsCostResponse,
} from '@kbn/significant-events-plugin/common';
import { getFormattedError } from '../util/errors';
import { useKibana } from './use_kibana';

export const SIGNIFICANT_EVENTS_COST_QUERY_KEY = ['significantEventsCost'] as const;

export const useSignificantEventsCost = ({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;

  return useQuery<SignificantEventsCostResponse, Error>({
    queryKey: SIGNIFICANT_EVENTS_COST_QUERY_KEY,
    queryFn: async ({ signal }: QueryFunctionContext) =>
      (await significantEventsRepositoryClient.fetch('GET /internal/significant_events/cost', {
        signal: signal ?? null,
      })) as SignificantEventsCostResponse,
    enabled,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
};

export const useSetSignificantEventsTokenTracking = () => {
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
  const mutation = useMutation<SetTokenUsageTrackingResponse, Error, { enabled: boolean }>({
    mutationFn: async (body) =>
      (await significantEventsRepositoryClient.fetch(
        'PUT /internal/significant_events/cost/token_usage_tracking',
        {
          signal: null,
          params: { body },
        }
      )) as SetTokenUsageTrackingResponse,
    onSuccess: (result) => {
      let hasWarning = false;
      if (result.failedSpaces.length > 0) {
        hasWarning = true;
        toasts.addWarning({
          title: i18n.translate(
            'xpack.significantEventsApp.cost.trackingPartialSuccessToastTitle',
            {
              defaultMessage:
                'Token usage tracking could not be updated in {count, plural, one {# space} other {# spaces}}',
              values: { count: result.failedSpaces.length },
            }
          ),
        });
      }
      if (!result.auditRecorded) {
        hasWarning = true;
        toasts.addWarning({
          title: i18n.translate('xpack.significantEventsApp.cost.trackingAuditFailedToastTitle', {
            defaultMessage:
              'Token tracking changed, but its coverage record could not be saved. Retry the same action.',
          }),
        });
      }
      if (hasWarning) {
        return;
      }
      toasts.addSuccess({
        title: i18n.translate('xpack.significantEventsApp.cost.trackingSuccessToastTitle', {
          defaultMessage: 'Updated token usage tracking in all spaces',
        }),
      });
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.significantEventsApp.cost.trackingErrorToastTitle', {
          defaultMessage: 'Failed to update token usage tracking',
        }),
      });
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: SIGNIFICANT_EVENTS_COST_QUERY_KEY,
      }),
  });

  return {
    setTracking: (enabled: boolean) => mutation.mutateAsync({ enabled }),
    isUpdating: mutation.isLoading,
  };
};
