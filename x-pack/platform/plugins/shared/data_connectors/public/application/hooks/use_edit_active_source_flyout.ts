/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { API_BASE_PATH } from '../../../common/constants';
import type { ActiveSource } from '../../types/connector';
import type { StackConnectorApiResponse } from '../../types/stack_connector';
import { transformStackConnectorResponse } from '../../types/stack_connector';
import { queryKeys } from '../query_keys';

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

  // Fetch stack connector using useQuery
  const { data: stackConnector, isLoading: isLoadingConnector } = useQuery(
    queryKeys.stackConnectors.byId(stackConnectorId ?? ''),
    async () => {
      if (!stackConnectorId) {
        throw new Error('No stack connector ID provided');
      }

      const connectorResponse = await http.get<StackConnectorApiResponse>(
        `/api/actions/connector/${stackConnectorId}`
      );

      // Transform snake_case response to camelCase
      return transformStackConnectorResponse(connectorResponse);
    },
    {
      enabled: isOpen && !!stackConnectorId, // Only fetch when flyout is open and we have an ID
      staleTime: 0, // Ensure fresh fetch
      cacheTime: 0, // Clean cache after unmount
      refetchOnMount: 'always', // Always refetch when component mounts
      onError: (error: Error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.dataConnectors.hooks.useEditActiveSourceFlyout.loadError', {
            defaultMessage: 'Failed to load connector details',
          }),
        });
      },
    }
  );

  const openFlyout = useCallback(() => {
    // Invalidate stack connector cache before opening to ensure fresh data
    if (stackConnectorId) {
      queryClient.invalidateQueries(queryKeys.stackConnectors.byId(stackConnectorId));
    }
    setIsOpen(true);
  }, [stackConnectorId, queryClient]);

  const closeFlyout = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Mutation for updating data connector name
  const updateDataConnectorMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return http.put(`${API_BASE_PATH}/${id}`, {
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate both caches to refresh the table and edit flyout
      queryClient.invalidateQueries(queryKeys.dataConnectors.list());
      if (stackConnectorId) {
        queryClient.invalidateQueries(queryKeys.stackConnectors.byId(stackConnectorId));
      }

      toasts.addSuccess(
        i18n.translate('xpack.dataConnectors.hooks.useEditActiveSourceFlyout.updateSuccessText', {
          defaultMessage: 'Data source {connectorName} updated successfully',
          values: {
            connectorName: variables.name,
          },
        })
      );

      // Call user callback
      onConnectorUpdated?.();
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.dataConnectors.hooks.useEditActiveSourceFlyout.updateErrorTitle',
          {
            defaultMessage: 'Failed to update data connector',
          }
        ),
      });
    },
  });

  const handleConnectorUpdated = useCallback(
    (updatedConnector: ActionConnector) => {
      if (!activeSource) {
        closeFlyout();
        return;
      }

      // Close flyout immediately to avoid flicker
      closeFlyout();

      // If connector name changed, update data connector name in background
      if (updatedConnector.name !== activeSource.name) {
        updateDataConnectorMutation.mutate({
          id: activeSource.id,
          name: updatedConnector.name,
        });
      } else {
        // No name change, just call callback
        onConnectorUpdated?.();
      }
    },
    [activeSource, onConnectorUpdated, closeFlyout, updateDataConnectorMutation]
  );

  const flyout = useMemo(() => {
    if (!isOpen || !stackConnector || isLoadingConnector) {
      return null;
    }

    return triggersActionsUi.getEditConnectorFlyout({
      connector: stackConnector,
      onClose: closeFlyout,
      onConnectorUpdated: handleConnectorUpdated,
    });
  }, [
    isOpen,
    stackConnector,
    isLoadingConnector,
    closeFlyout,
    handleConnectorUpdated,
    triggersActionsUi,
  ]);

  return {
    openFlyout,
    closeFlyout,
    isOpen,
    isSaving: updateDataConnectorMutation.isLoading,
    isLoadingConnector,
    flyout,
  };
};
