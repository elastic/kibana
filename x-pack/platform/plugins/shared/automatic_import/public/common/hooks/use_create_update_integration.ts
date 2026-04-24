/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { CreateAutoImportIntegrationResponse } from '../../../common';
import { createIntegration, type CreateUpdateIntegrationRequest } from '../lib/api';
import { useKibana } from './use_kibana';
import * as i18n from './translations';

export interface UseCreateUpdateIntegrationResult {
  createUpdateIntegrationMutation: ReturnType<
    typeof useMutation<CreateAutoImportIntegrationResponse, Error, CreateUpdateIntegrationRequest>
  >;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to create or update an integration with data streams.
 * Uses React Query for mutation management with automatic cache invalidation.
 * Navigates to the edit page after successful creation/update.
 */
export function useCreateUpdateIntegration(): UseCreateUpdateIntegrationResult {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const mutation = useMutation<
    CreateAutoImportIntegrationResponse,
    Error,
    CreateUpdateIntegrationRequest
  >({
    mutationFn: async (request: CreateUpdateIntegrationRequest) => {
      return createIntegration({ http, ...request });
    },
    onSuccess: (data) => {
      // Invalidate the specific integration cache to include new data streams
      if (data.integration_id) {
        queryClient.invalidateQueries({ queryKey: ['integration', data.integration_id] });
      }

      notifications.toasts.addSuccess({
        title: i18n.SAVE_INTEGRATION_SUCCESS,
        text: i18n.SAVE_INTEGRATION_SUCCESS_DESCRIPTION(data.integration_id ?? ''),
      });
    },
    onError: (error) => {
      notifications.toasts.addError(error, {
        title: i18n.SAVE_INTEGRATION_ERROR,
      });
    },
  });

  return {
    createUpdateIntegrationMutation: mutation,
    isLoading: mutation.isLoading,
    error: mutation.error,
  };
}
