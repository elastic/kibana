/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, useCallback, useMemo, useState, useRef } from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared/src/common/types';
import { useKibana } from './use_kibana';
import { API_BASE_PATH } from '../../../common/constants';
import { queryKeys } from '../query_keys';
import { dataSourceUIConfigRegistry } from '../lib/data_source_ui_configs';
import { DataSourceConnectorFlyout } from '../components/data_source_connector_flyout';
import {
  transformStackConnectorResponse,
  type CreateStackConnectorRequest,
  type StackConnectorApiResponse,
} from '../../types/stack_connector';
import type { CreateDataSourceRequest } from '../../types/connector';

export interface UseAddConnectorFlyoutOptions {
  onConnectorCreated?: (connector: ActionConnector) => void;
  dataSourceType?: string;
  suggestedName?: string;
  icon?: IconType;
}

/**
 * Hook to manage the connector creation flyout.
 */
export const useAddConnectorFlyout = ({
  onConnectorCreated,
  dataSourceType,
  suggestedName,
  icon,
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
  const [currentDataSourceType, setCurrentDataSourceType] = useState<string | undefined>(
    dataSourceType
  );
  const loadingToastRef = useRef<ReturnType<typeof toasts.addInfo> | undefined>();

  const openFlyout = useCallback(
    (actionTypeId?: string, dataSourceTypeOverride?: string) => {
      setSelectedConnectorType(actionTypeId);
      // Use override if provided, otherwise fall back to initial value
      setCurrentDataSourceType(dataSourceTypeOverride || dataSourceType);
      setIsOpen(true);
    },
    [dataSourceType]
  );

  const closeFlyout = useCallback(() => {
    setIsOpen(false);
    setSelectedConnectorType(undefined);
  }, []);

  // Mutation for creating stack connector
  const createStackConnectorMutation = useMutation({
    mutationFn: async (payload: CreateStackConnectorRequest) => {
      return http.post<StackConnectorApiResponse>('/api/actions/connector', {
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (apiResponse, variables) => {
      // Transform API response to ActionConnector format using utility
      const connector = transformStackConnectorResponse(apiResponse);

      toasts.addSuccess(
        i18n.translate('xpack.dataSources.hooks.useAddConnectorFlyout.connectorCreatedSuccess', {
          defaultMessage: 'Connector "{name}" created successfully',
          values: { name: connector.name },
        })
      );
    },
    onError: (error) => {
      toasts.addError(error as Error, {
        title: i18n.translate(
          'xpack.dataSources.hooks.useAddConnectorFlyout.connectorCreateError',
          {
            defaultMessage: 'Failed to create connector',
          }
        ),
      });
    },
  });

  // Mutation for creating data source (after stack connector is created)
  const createDataSourceMutation = useMutation({
    mutationFn: async (payload: CreateDataSourceRequest) => {
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
          toastLifeTimeMs: 60000,
        }
      );
      loadingToastRef.current = loadingToast;
      return { loadingToast };
    },
    onSuccess: async (data, variables) => {
      // Wait for query invalidation to complete before dismissing toast
      await queryClient.invalidateQueries(queryKeys.dataSources.list());

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
          defaultMessage: 'Failed to create data source',
        }),
      });
    },
  });

  // Handler for standard Kibana connector flyout (Notion, etc.)
  const handleStandardConnectorCreated = useCallback(
    (connector: ActionConnector) => {
      // Call user callback first
      onConnectorCreated?.(connector);

      // Close flyout immediately
      closeFlyout();

      // If no currentDataSourceType, skip data connector creation
      if (!currentDataSourceType) {
        return;
      }

      // Create data source in the background using mutation
      createDataSourceMutation.mutate({
        name: connector.name,
        stack_connector_id: connector.id,
        type: currentDataSourceType,
      });
    },
    [currentDataSourceType, onConnectorCreated, closeFlyout, createDataSourceMutation]
  );

  // Handler for custom flyout (GitHub, etc. with UI overrides)
  const handleCustomConnectorSave = useCallback(
    async (
      serializedData: Pick<ConnectorFormSchema, 'actionTypeId' | 'config' | 'secrets'> & {
        name: string;
      }
    ) => {
      if (!currentDataSourceType) {
        throw new Error('Data source type is required to create a data source.');
      }

      // Create the stack connector first
      const createdConnector = await createStackConnectorMutation.mutateAsync({
        connector_type_id: serializedData.actionTypeId,
        name: serializedData.name,
        config: serializedData.config,
        secrets: serializedData.secrets,
      });

      // Then create the data source record
      await createDataSourceMutation.mutateAsync({
        name: createdConnector.name,
        stack_connector_id: createdConnector.id,
        type: currentDataSourceType,
      });

      closeFlyout();
    },
    [currentDataSourceType, createStackConnectorMutation, createDataSourceMutation, closeFlyout]
  );

  const flyout = useMemo(() => {
    if (!isOpen) {
      return null;
    }

    // Check if this data source needs UI override
    const uiConfig = currentDataSourceType
      ? dataSourceUIConfigRegistry.get(currentDataSourceType)
      : undefined;

    // For data sources with UI overrides (like GitHub with MCP), use our unified flyout
    if (uiConfig?.uiOverride && selectedConnectorType === '.mcp') {
      return createElement(DataSourceConnectorFlyout, {
        mode: 'create',
        uiOverride: uiConfig.uiOverride,
        suggestedName,
        icon,
        onSave: handleCustomConnectorSave,
        onClose: closeFlyout,
        isSaving: createStackConnectorMutation.isLoading || createDataSourceMutation.isLoading,
      });
    }

    return triggersActionsUi.getAddConnectorFlyout({
      onClose: closeFlyout,
      onConnectorCreated: handleStandardConnectorCreated,
      ...(icon && { icon }),
      ...(selectedConnectorType && {
        initialConnector: {
          actionTypeId: selectedConnectorType,
          ...(suggestedName && { name: suggestedName }),
        },
      }),
    });
  }, [
    isOpen,
    currentDataSourceType,
    selectedConnectorType,
    suggestedName,
    icon,
    closeFlyout,
    handleCustomConnectorSave,
    handleStandardConnectorCreated,
    triggersActionsUi,
    createStackConnectorMutation.isLoading,
    createDataSourceMutation.isLoading,
  ]);

  return {
    openFlyout,
    closeFlyout,
    isOpen,
    isSaving: createStackConnectorMutation.isLoading || createDataSourceMutation.isLoading,
    flyout,
  };
};
