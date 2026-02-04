/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, useCallback, useMemo, useState } from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared/src/common/types';
import { useKibana } from './use_kibana';
import { API_BASE_PATH } from '../../../common/constants';
import type { ActiveSource } from '../../types/connector';
import { queryKeys } from '../query_keys';
import { useStackConnector } from './use_stack_connector';
import { getConnectorIconType } from '../../utils/get_connector_icon';
import { dataSourceUIConfigRegistry } from '../lib/data_source_ui_configs';
import { DataSourceConnectorFlyout } from '../components/data_source_connector_flyout';
import {
  transformStackConnectorResponse,
  type UpdateStackConnectorRequest,
  type StackConnectorApiResponse,
} from '../../types/stack_connector';
import type { UpdateDataSourceNameRequest } from '../../types/connector';

export interface UseEditActiveSourceFlyoutOptions {
  activeSource: ActiveSource | null;
  onConnectorUpdated?: () => void;
}

/**
 * Hook to manage the connector edit flyout for active sources.
 */
export const useEditActiveSourceFlyout = ({
  activeSource,
  onConnectorUpdated,
}: UseEditActiveSourceFlyoutOptions) => {
  const {
    services: {
      plugins: { triggersActionsUi },
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Get stack connector ID (first one if multiple exist)
  // FIXME: need to clarify if a source can have multiple stack connectors
  const stackConnectorId =
    activeSource && activeSource.stackConnectors.length > 0
      ? activeSource.stackConnectors[0]
      : null;

  // Fetch stack connector details
  const { stackConnector, isLoading: isLoadingConnector } = useStackConnector({
    stackConnectorId,
    enabled: isOpen,
  });

  const openFlyout = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Mutation for updating stack connector
  const updateStackConnectorMutation = useMutation({
    mutationFn: async (payload: UpdateStackConnectorRequest & { connectorId: string }) => {
      return http.put<StackConnectorApiResponse>(`/api/actions/connector/${payload.connectorId}`, {
        body: JSON.stringify({
          name: payload.name,
          config: payload.config,
          secrets: payload.secrets,
        }),
      });
    },
    onSuccess: (apiResponse, variables) => {
      // Transform API response to ActionConnector format using utility
      const updatedConnector = transformStackConnectorResponse(apiResponse);
      toasts.addSuccess(
        i18n.translate('xpack.dataSources.hooks.useEditActiveSourceFlyout.connectorUpdateSuccess', {
          defaultMessage: 'Connector "{name}" updated successfully',
          values: { name: updatedConnector.name },
        })
      );

      closeFlyout();

      // Invalidate connector cache
      queryClient.invalidateQueries(queryKeys.stackConnectors.byId(variables.connectorId));

      if (activeSource && updatedConnector.name !== activeSource.name) {
        updateDataSourceNameMutation.mutate({
          id: activeSource.id,
          name: updatedConnector.name,
        });
      } else {
        queryClient.invalidateQueries(queryKeys.dataSources.list());
        onConnectorUpdated?.();
      }
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.dataSources.hooks.useEditActiveSourceFlyout.connectorUpdateError',
          {
            defaultMessage: 'Failed to update connector',
          }
        ),
      });
    },
  });

  // Mutation for updating data source name (after stack connector update)
  const updateDataSourceNameMutation = useMutation({
    mutationFn: async (payload: UpdateDataSourceNameRequest & { id: string }) => {
      return http.put(`${API_BASE_PATH}/${payload.id}`, {
        body: JSON.stringify({ name: payload.name }),
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate data sources cache to refresh the table
      queryClient.invalidateQueries(queryKeys.dataSources.list());

      toasts.addSuccess(
        i18n.translate(
          'xpack.dataSources.hooks.useEditActiveSourceFlyout.dataSourceUpdateSuccess',
          {
            defaultMessage: 'Data source {connectorName} updated successfully',
            values: {
              connectorName: variables.name,
            },
          }
        )
      );

      // Call user callback
      onConnectorUpdated?.();
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.dataSources.hooks.useEditActiveSourceFlyout.dataSourceUpdateError',
          {
            defaultMessage: 'Failed to update data source',
          }
        ),
      });
    },
  });

  // Handler for standard Kibana connector flyout (Notion, etc.)
  const handleStandardConnectorUpdated = useCallback(
    (updatedConnector: ActionConnector) => {
      if (!activeSource) {
        closeFlyout();
        return;
      }

      // Close flyout immediately to avoid flicker
      closeFlyout();

      // If connector name changed, update data source name in background
      if (updatedConnector.name !== activeSource.name) {
        updateDataSourceNameMutation.mutate({
          id: activeSource.id,
          name: updatedConnector.name,
        });
      } else {
        queryClient.invalidateQueries(queryKeys.dataSources.list());
        onConnectorUpdated?.();
      }
    },
    [activeSource, onConnectorUpdated, closeFlyout, updateDataSourceNameMutation, queryClient]
  );

  // Handler for custom flyout (GitHub, etc. with UI overrides)
  const handleCustomConnectorSave = useCallback(
    async (
      serializedData: Pick<ConnectorFormSchema, 'actionTypeId' | 'config' | 'secrets'> & {
        name: string;
      }
    ) => {
      if (!activeSource || !stackConnector) {
        throw new Error('Active source or stack connector not available for update.');
      }

      // Update the stack connector first
      const updatedStackConnector = await updateStackConnectorMutation.mutateAsync({
        connectorId: stackConnector.id,
        name: serializedData.name,
        config: serializedData.config,
        secrets: serializedData.secrets,
      });

      // If the data source name is different from the connector name, update it separately
      if (updatedStackConnector.name !== activeSource.name) {
        await updateDataSourceNameMutation.mutateAsync({
          id: activeSource.id,
          name: updatedStackConnector.name,
        });
      } else {
        // No name change, just call callback
        onConnectorUpdated?.();
      }

      closeFlyout();
    },
    [
      activeSource,
      stackConnector,
      updateStackConnectorMutation,
      updateDataSourceNameMutation,
      onConnectorUpdated,
      closeFlyout,
    ]
  );

  const flyout = useMemo(() => {
    if (!isOpen || !stackConnector || isLoadingConnector || !activeSource) {
      return null;
    }

    // Check if this data source needs UI override
    const uiConfig = dataSourceUIConfigRegistry.get(activeSource.type);

    // For data sources with UI overrides (like GitHub with MCP), use our unified flyout
    if (uiConfig?.uiOverride && stackConnector.actionTypeId === '.mcp') {
      // Override stack connector name with data source name
      const connectorWithDataSourceName = {
        ...stackConnector,
        name: activeSource.name,
      };

      return createElement(DataSourceConnectorFlyout, {
        mode: 'edit',
        uiOverride: uiConfig.uiOverride,
        connector: connectorWithDataSourceName,
        icon: getConnectorIconType(activeSource.iconType),
        onSave: handleCustomConnectorSave,
        onClose: closeFlyout,
        isSaving: updateStackConnectorMutation.isLoading || updateDataSourceNameMutation.isLoading,
      });
    }

    return triggersActionsUi.getEditConnectorFlyout({
      connector: {
        ...stackConnector,
        name: activeSource.name,
      },
      icon: getConnectorIconType(activeSource.iconType),
      hideRulesTab: true,
      isTestable: false,
      onClose: closeFlyout,
      onConnectorUpdated: handleStandardConnectorUpdated,
    });
  }, [
    isOpen,
    stackConnector,
    isLoadingConnector,
    activeSource,
    closeFlyout,
    handleCustomConnectorSave,
    handleStandardConnectorUpdated,
    triggersActionsUi,
    updateStackConnectorMutation.isLoading,
    updateDataSourceNameMutation.isLoading,
  ]);

  return {
    openFlyout,
    closeFlyout,
    isOpen,
    isSaving: updateStackConnectorMutation.isLoading || updateDataSourceNameMutation.isLoading,
    isLoadingConnector,
    flyout,
  };
};
