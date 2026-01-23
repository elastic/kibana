/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState, useRef } from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { API_BASE_PATH } from '../../../common/constants';
import { queryKeys } from '../query_keys';

export interface UseAddConnectorFlyoutOptions {
  onConnectorCreated?: (connector: ActionConnector) => void;
  dataSourceType?: string;
  suggestedName?: string;
}

interface CreateDataConnectorPayload {
  name: string;
  stack_connector_id: string;
  type: string;
}

/**
 * Hook to manage the connector creation flyout.
 */
export const useAddConnectorFlyout = ({
  onConnectorCreated,
  dataSourceType,
  suggestedName,
}: UseAddConnectorFlyoutOptions = {}) => {
  const {
    services: {
      plugins: { triggersActionsUi },
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConnectorType, setSelectedConnectorType] = useState<string | undefined>();
  const loadingToastRef = useRef<ReturnType<typeof toasts.addInfo> | undefined>();

  const openFlyout = useCallback((actionTypeId?: string) => {
    setSelectedConnectorType(actionTypeId);
    setIsOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsOpen(false);
    setSelectedConnectorType(undefined);
  }, []);

  // Mutation for creating data connector
  const createDataConnectorMutation = useMutation({
    mutationFn: async (payload: CreateDataConnectorPayload) => {
      return http.post(`${API_BASE_PATH}`, {
        body: JSON.stringify(payload),
      });
    },
    onMutate: ({ name }) => {
      // Show loading toast
      const loadingToast = toasts.addInfo(
        {
          title: i18n.translate('xpack.dataSources.hooks.useAddConnectorFlyout.creatingTitle', {
            defaultMessage: 'Creating data source',
          }),
          text: i18n.translate('xpack.dataSources.hooks.useAddConnectorFlyout.creatingText', {
            defaultMessage: 'Setting up {connectorName}...',
            values: {
              connectorName: name,
            },
          }),
        },
        {
          toastLifeTimeMs: 30000,
        }
      );
      loadingToastRef.current = loadingToast;
      return { loadingToast };
    },
    onSuccess: (data, variables) => {
      // Dismiss loading toast
      if (loadingToastRef.current) {
        toasts.remove(loadingToastRef.current);
        loadingToastRef.current = undefined;
      }

      // Show success toast
      toasts.addSuccess(
        i18n.translate('xpack.dataSources.hooks.useAddConnectorFlyout.createSuccessText', {
          defaultMessage: 'Data source {connectorName} connected successfully',
          values: {
            connectorName: variables.name,
          },
        })
      );

      // Invalidate queries to refresh Active Sources table
      queryClient.invalidateQueries(queryKeys.dataSources.list());
    },
    onError: (error, variables) => {
      // Dismiss loading toast
      if (loadingToastRef.current) {
        toasts.remove(loadingToastRef.current);
        loadingToastRef.current = undefined;
      }

      // Show error toast
      toasts.addError(error as Error, {
        title: i18n.translate('xpack.dataSources.hooks.useAddConnectorFlyout.createErrorTitle', {
          defaultMessage: 'Failed to create data connector',
        }),
      });
    },
  });

  const handleConnectorCreated = useCallback(
    (connector: ActionConnector) => {
      // Call user callback first
      onConnectorCreated?.(connector);

      // Close flyout immediately
      closeFlyout();

      // If no dataSourceType, skip data connector creation
      if (!dataSourceType) {
        return;
      }

      // Create data connector in the background using mutation
      createDataConnectorMutation.mutate({
        name: connector.name,
        stack_connector_id: connector.id,
        type: dataSourceType,
      });
    },
    [dataSourceType, onConnectorCreated, closeFlyout, createDataConnectorMutation]
  );

  const flyout = useMemo(() => {
    if (!isOpen) {
      return null;
    }

    return triggersActionsUi.getAddConnectorFlyout({
      onClose: closeFlyout,
      onConnectorCreated: handleConnectorCreated,
      ...(selectedConnectorType && {
        initialConnector: {
          actionTypeId: selectedConnectorType,
          ...(suggestedName && { name: suggestedName }),
        },
      }),
    });
  }, [
    isOpen,
    selectedConnectorType,
    suggestedName,
    closeFlyout,
    handleConnectorCreated,
    triggersActionsUi,
  ]);

  return {
    openFlyout,
    closeFlyout,
    isOpen,
    isSaving: createDataConnectorMutation.isLoading,
    flyout,
  };
};
