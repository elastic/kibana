/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { API_BASE_PATH } from '../../../common/constants';
import type { ActiveSource } from '../../types/connector';

/**
 * API response type for GET /api/actions/connector/{id}
 */
interface ConnectorApiResponse {
  id: string;
  name: string;
  config?: Record<string, unknown>;
  connector_type_id: string;
  is_missing_secrets?: boolean;
  is_preconfigured: boolean;
  is_deprecated: boolean;
  is_system_action: boolean;
  is_connector_type_deprecated: boolean;
  referenced_by_count?: number;
}

/**
 * Transform a single connector response from snake_case to camelCase
 */
const transformConnector = (data: ConnectorApiResponse): ActionConnector => {
  const {
    connector_type_id: actionTypeId,
    is_preconfigured: isPreconfigured,
    is_deprecated: isDeprecated,
    referenced_by_count: referencedByCount,
    is_missing_secrets: isMissingSecrets,
    is_system_action: isSystemAction,
    is_connector_type_deprecated: isConnectorTypeDeprecated,
    ...rest
  } = data;

  return {
    actionTypeId,
    isPreconfigured,
    isDeprecated,
    referencedByCount,
    isMissingSecrets,
    isSystemAction,
    isConnectorTypeDeprecated,
    secrets: {}, // Secrets are never returned from API for security
    ...rest,
  } as ActionConnector;
};

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
  const [stackConnector, setStackConnector] = useState<ActionConnector | null>(null);
  const [isLoadingConnector, setIsLoadingConnector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch stack connector when active source changes
  useEffect(() => {
    const fetchStackConnector = async () => {
      if (!activeSource || activeSource.stackConnectors.length === 0) {
        return;
      }

      setIsLoadingConnector(true);
      try {
        // FIX ME: need to clarify if a source can have multiple stack connectors
        const stackConnectorId = activeSource.stackConnectors[0];
        const connectorResponse = await http.get<ConnectorApiResponse>(
          `/api/actions/connector/${stackConnectorId}`
        );

        // Transform snake_case response to camelCase
        const connector = transformConnector(connectorResponse);
        setStackConnector(connector);
      } catch (error) {
        toasts.addError(error as Error, {
          title: i18n.translate('xpack.dataConnectors.hooks.useEditActiveSourceFlyout.loadError', {
            defaultMessage: 'Failed to load connector details',
          }),
        });
        setStackConnector(null);
      } finally {
        setIsLoadingConnector(false);
      }
    };

    if (isOpen && activeSource) {
      fetchStackConnector();
    }
  }, [activeSource, isOpen, http, toasts]);

  const openFlyout = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsOpen(false);
    setStackConnector(null);
    setIsSaving(false);
  }, []);

  const handleConnectorUpdated = useCallback(
    async (updatedConnector: ActionConnector) => {
      if (!activeSource) {
        closeFlyout();
        return;
      }

      // If connector name changed, update data connector name
      setIsSaving(true);
      try {
        if (updatedConnector.name !== activeSource.name) {
          await http.put(`${API_BASE_PATH}/${activeSource.id}`, {
            body: JSON.stringify({
              name: updatedConnector.name,
            }),
          });
        }

        // Invalidate cache to refresh the table
        queryClient.invalidateQueries(['dataConnectors', 'list']);

        toasts.addSuccess(
          i18n.translate('xpack.dataConnectors.hooks.useEditActiveSourceFlyout.updateSuccessText', {
            defaultMessage: 'Data source {connectorName} updated successfully',
            values: {
              connectorName: updatedConnector.name,
            },
          })
        );

        // Success! Call callback and close flyout
        onConnectorUpdated?.();
        closeFlyout();
      } catch (error) {
        toasts.addError(error as Error, {
          title: i18n.translate(
            'xpack.dataConnectors.hooks.useEditActiveSourceFlyout.updateErrorTitle',
            {
              defaultMessage: 'Failed to update data connector',
            }
          ),
        });
        setIsSaving(false);
      }
    },
    [activeSource, http, toasts, onConnectorUpdated, closeFlyout, queryClient]
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
    isSaving,
    isLoadingConnector,
    flyout,
  };
};
