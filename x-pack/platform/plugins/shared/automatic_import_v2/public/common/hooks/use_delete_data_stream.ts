/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { deleteDataStream, type DeleteDataStreamRequest } from '../lib/api';
import { useKibana } from './use_kibana';
import * as i18n from './translations';

export interface UseDeleteDataStreamResult {
  deleteDataStreamMutation: ReturnType<typeof useMutation<void, Error, DeleteDataStreamRequest>>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to delete a data stream from an integration.
 * Uses React Query for mutation management with automatic cache invalidation.
 */
export function useDeleteDataStream(): UseDeleteDataStreamResult {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, DeleteDataStreamRequest>({
    mutationFn: async (request: DeleteDataStreamRequest) => {
      return deleteDataStream({ http, ...request });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration', variables.integrationId] });

      notifications.toasts.addSuccess({
        title: i18n.DELETE_DATA_STREAM_SUCCESS,
      });
    },
    onError: (error) => {
      notifications.toasts.addError(error, {
        title: i18n.DELETE_DATA_STREAM_ERROR,
      });
    },
  });

  return {
    deleteDataStreamMutation: mutation,
    isLoading: mutation.isLoading,
    error: mutation.error,
  };
}
