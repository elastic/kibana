/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { deleteIntegration, type DeleteIntegrationRequest } from '../lib/api';
import { useKibana } from './use_kibana';
import * as i18n from './translations';

export interface UseDeleteIntegrationResult {
  deleteIntegrationMutation: ReturnType<typeof useMutation<void, Error, DeleteIntegrationRequest>>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to delete an automatic import integration
 */
export function useDeleteIntegration(): UseDeleteIntegrationResult {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, DeleteIntegrationRequest>({
    mutationFn: async (request: DeleteIntegrationRequest) => {
      return deleteIntegration({ http, ...request });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration', variables.integrationId] });
      queryClient.invalidateQueries({ queryKey: ['all-integrations'] });
      notifications.toasts.addSuccess({
        title: i18n.DELETE_INTEGRATION_SUCCESS,
      });
    },
    onError: (error) => {
      notifications.toasts.addError(error, {
        title: i18n.DELETE_INTEGRATION_ERROR,
      });
    },
  });

  return {
    deleteIntegrationMutation: mutation,
    isLoading: mutation.isLoading,
    error: mutation.error,
  };
}
