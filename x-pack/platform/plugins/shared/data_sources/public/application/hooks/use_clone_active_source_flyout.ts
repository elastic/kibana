/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from './use_kibana';
import type { ActiveSource } from '../../types/connector';
import type { StackConnectorApiResponse } from '../../types/stack_connector';
import { transformStackConnectorResponse } from '../../types/stack_connector';
import { queryKeys } from '../query_keys';
import { useCloneActiveSource } from './use_clone_active_source';
import { useAddConnectorFlyout } from './use_add_connector_flyout';

export interface UseCloneActiveSourceFlyoutOptions {
  sourceToClone: ActiveSource | null;
  onConnectorCreated?: (connector: ActionConnector) => void;
}

/**
 * Hook to manage the connector clone flyout for active sources.
 * Fetches the actual stack connector to get its real actionTypeId,
 * ensuring clones use the correct connector type (e.g., .mcp for GitHub).
 */
export const useCloneActiveSourceFlyout = ({
  sourceToClone,
  onConnectorCreated,
}: UseCloneActiveSourceFlyoutOptions) => {
  const {
    services: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { getCloneName } = useCloneActiveSource();
  const [shouldOpenFlyout, setShouldOpenFlyout] = useState(false);

  // Get stack connector ID from the source to clone
  const stackConnectorId =
    sourceToClone && sourceToClone.stackConnectors.length > 0
      ? sourceToClone.stackConnectors[0]
      : null;

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
      enabled: shouldOpenFlyout && !!stackConnectorId, // Only fetch when triggered and we have an ID
      onError: (error: Error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.dataSources.hooks.useCloneActiveSourceFlyout.loadError', {
            defaultMessage: 'Failed to load connector details',
          }),
        });
        setShouldOpenFlyout(false); // Reset on error
      },
    }
  );

  // Generate suggested clone name
  const clonedName = sourceToClone ? getCloneName(sourceToClone) : undefined;

  // Use the add connector flyout with the data source type and suggested name
  const {
    openFlyout: openAddFlyout,
    flyout,
    ...rest
  } = useAddConnectorFlyout({
    dataSourceType: sourceToClone?.type,
    suggestedName: clonedName,
    onConnectorCreated,
  });

  // When stack connector is loaded and we want to open the flyout, do it automatically
  useEffect(() => {
    if (shouldOpenFlyout && stackConnector && !isLoadingConnector) {
      // Open the flyout with the actual stack connector type (e.g., '.mcp' for GitHub)
      openAddFlyout(stackConnector.actionTypeId);
      setShouldOpenFlyout(false); // Reset flag
    }
  }, [shouldOpenFlyout, stackConnector, isLoadingConnector, openAddFlyout]);

  const openFlyout = useCallback(() => {
    setShouldOpenFlyout(true);
  }, []);

  return {
    openFlyout,
    flyout,
    isLoadingConnector,
    ...rest,
  };
};
