/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { IntegrationResponse, DataStreamResponse } from '../../../common';
import { deleteDataStream, type DeleteDataStreamRequest } from '../lib/api';
import { useKibana } from './use_kibana';
import * as i18n from './translations';

export interface UseDeleteDataStreamResult {
  deleteDataStreamMutation: ReturnType<typeof useMutation<void, Error, DeleteDataStreamRequest>>;
  isLoading: boolean;
  error: Error | null;
}

interface MutationContext {
  previousIntegration: IntegrationResponse | undefined;
}

/**
 * Hook to delete a data stream from an integration.
 * Uses React Query for mutation management with optimistic updates.
 * Immediately sets the data stream status to 'deleting' in the cache,
 * ensuring consistent UI even when multiple deletes are in progress.
 */
export function useDeleteDataStream(): UseDeleteDataStreamResult {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, DeleteDataStreamRequest, MutationContext>({
    mutationFn: async (request: DeleteDataStreamRequest) => {
      return deleteDataStream({ http, ...request });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['integration', variables.integrationId] });

      const previousIntegration = queryClient.getQueryData<IntegrationResponse>([
        'integration',
        variables.integrationId,
      ]);

      if (previousIntegration) {
        queryClient.setQueryData<IntegrationResponse>(['integration', variables.integrationId], {
          ...previousIntegration,
          dataStreams: previousIntegration.dataStreams.map((ds: DataStreamResponse) =>
            ds.dataStreamId === variables.dataStreamId ? { ...ds, status: 'deleting' as const } : ds
          ),
        });
      }

      return { previousIntegration };
    },
    onError: (error, variables, context) => {
      if (context?.previousIntegration) {
        queryClient.setQueryData(
          ['integration', variables.integrationId],
          context.previousIntegration
        );
      }
      notifications.toasts.addError(error, {
        title: i18n.DELETE_DATA_STREAM_ERROR,
      });
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after error or success to get the real server state. To have more "realtime" updates
      queryClient.invalidateQueries({ queryKey: ['integration', variables.integrationId] });
    },
    onSuccess: () => {
      notifications.toasts.addSuccess({
        title: i18n.DELETE_DATA_STREAM_SUCCESS,
      });
    },
  });

  return {
    deleteDataStreamMutation: mutation,
    isLoading: mutation.isLoading,
    error: mutation.error,
  };
}
