/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { CreateAutoImportIntegrationResponse } from '../../../common';
import { PLUGIN_ID } from '../../../common/constants';
import { createIntegration, type CreateIntegrationRequest } from '../lib/api';
import { useKibana } from './use_kibana';
import * as i18n from './translations';
import { useUIState } from '../../components/integration_management/contexts';

export interface UseCreateIntegrationResult {
  createIntegrationMutation: ReturnType<
    typeof useMutation<CreateAutoImportIntegrationResponse, Error, CreateIntegrationRequest>
  >;
  isCreating: boolean;
  error: Error | null;
}

/**
 * Hook to create an integration with data streams.
 * Uses React Query for mutation management with automatic cache invalidation.
 * Navigates to the edit page after successful creation.
 */
export function useCreateIntegration(): UseCreateIntegrationResult {
  const { http, notifications, application } = useKibana().services;
  const { closeCreateDataStreamFlyout } = useUIState();
  const queryClient = useQueryClient();

  const mutation = useMutation<
    CreateAutoImportIntegrationResponse,
    Error,
    CreateIntegrationRequest
  >({
    mutationFn: async (request: CreateIntegrationRequest) => {
      return createIntegration({ http, ...request });
    },
    onSuccess: (data) => {
      // Invalidate the specific integration cache to include new data streams
      // we dont need this  if it is a "pure" create endpoint in the future
      if (data.integration_id) {
        queryClient.invalidateQueries({ queryKey: ['integration', data.integration_id] });
      }

      closeCreateDataStreamFlyout();

      notifications.toasts.addSuccess({
        title: i18n.CREATE_INTEGRATION_SUCCESS,
        text: i18n.CREATE_INTEGRATION_SUCCESS_DESCRIPTION(data.integration_id ?? ''),
      });

      // Navigate to the edit page for the newly created integration
      if (data.integration_id) {
        application.navigateToApp(PLUGIN_ID, {
          path: `/edit/${data.integration_id}`,
        });
      }
    },
    onError: (error) => {
      notifications.toasts.addError(error, {
        title: i18n.CREATE_INTEGRATION_ERROR,
      });
    },
  });

  return {
    createIntegrationMutation: mutation,
    isCreating: mutation.isLoading,
    error: mutation.error,
  };
}
