/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { API_BASE_PATH } from '../../../common/constants';

export interface UseAddConnectorFlyoutOptions {
  onConnectorCreated?: (connector: ActionConnector) => void;
  dataSourceType?: string;
}

/**
 * Hook to manage the connector creation flyout.
 */
export const useAddConnectorFlyout = ({
  onConnectorCreated,
  dataSourceType,
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
  const [isSaving, setIsSaving] = useState(false);

  const openFlyout = useCallback((actionTypeId?: string) => {
    setSelectedConnectorType(actionTypeId);
    setIsOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsOpen(false);
    setSelectedConnectorType(undefined);
    setIsSaving(false);
  }, []);

  const handleConnectorCreated = useCallback(
    async (connector: ActionConnector) => {
      // If no dataSourceType, close immediately (no additional processing needed)
      if (!dataSourceType) {
        onConnectorCreated?.(connector);
        closeFlyout();
        return;
      }

      // Show loading toast immediately
      const loadingToast = toasts.addInfo(
        {
          title: i18n.translate('xpack.dataConnectors.hooks.useAddConnectorFlyout.creatingTitle', {
            defaultMessage: 'Creating data source',
          }),
          text: i18n.translate('xpack.dataConnectors.hooks.useAddConnectorFlyout.creatingText', {
            defaultMessage: 'Setting up {connectorName}...',
            values: {
              connectorName: connector.name,
            },
          }),
        },
        {
          toastLifeTimeMs: 30000,
        }
      );

      // Close flyout immediately
      onConnectorCreated?.(connector);
      closeFlyout();

      // Continue creating data connector in the background
      try {
        await http.post(`${API_BASE_PATH}`, {
          body: JSON.stringify({
            name: connector.name,
            stack_connector_id: connector.id,
            type: dataSourceType,
          }),
        });

        // Dismiss loading toast
        toasts.remove(loadingToast);

        // Show success toast
        toasts.addSuccess(
          i18n.translate('xpack.dataConnectors.hooks.useAddConnectorFlyout.createSuccessText', {
            defaultMessage: 'Data source {connectorName} connected successfully',
            values: {
              connectorName: connector.name,
            },
          })
        );

        // Refresh Active Sources table
        queryClient.invalidateQueries(['dataConnectors', 'list']);
      } catch (error) {
        // Dismiss loading toast
        toasts.remove(loadingToast);

        // Show error toast
        toasts.addError(error as Error, {
          title: i18n.translate(
            'xpack.dataConnectors.hooks.useAddConnectorFlyout.createErrorTitle',
            {
              defaultMessage: 'Failed to create data connector',
            }
          ),
        });
      }
    },
    [dataSourceType, http, toasts, onConnectorCreated, closeFlyout, queryClient]
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
        },
      }),
    });
  }, [isOpen, selectedConnectorType, closeFlyout, handleConnectorCreated, triggersActionsUi]);

  return {
    openFlyout,
    closeFlyout,
    isOpen,
    isSaving,
    flyout,
  };
};
