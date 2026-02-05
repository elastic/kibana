/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';
import type { StackConnectorApiResponse } from '../../types/stack_connector';
import { transformStackConnectorResponse } from '../../types/stack_connector';
import { queryKeys } from '../query_keys';
import { STACK_CONNECTOR_API_ROUTE } from '../../../common/constants';

export interface UseStackConnectorOptions {
  stackConnectorId: string | null;
  enabled?: boolean;
}

/**
 * Hook to fetch a stack connector by ID.
 * Returns the transformed connector data with camelCase properties.
 *
 * @param stackConnectorId - The ID of the stack connector to fetch
 * @param enabled - Whether the query should be enabled (default: true if stackConnectorId exists)
 */
export const useStackConnector = ({
  stackConnectorId,
  enabled = true,
}: UseStackConnectorOptions) => {
  const {
    services: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const shouldFetch = enabled && !!stackConnectorId;

  const {
    data: stackConnector,
    isLoading,
    error,
  } = useQuery(
    queryKeys.stackConnectors.byId(stackConnectorId ?? ''),
    async () => {
      if (!stackConnectorId) {
        throw new Error('No stack connector ID provided');
      }

      const connectorResponse = await http.get<StackConnectorApiResponse>(
        `${STACK_CONNECTOR_API_ROUTE}/${stackConnectorId}`
      );

      return transformStackConnectorResponse(connectorResponse);
    },
    {
      enabled: shouldFetch,
      onError: (err: Error) => {
        toasts.addError(err, {
          title: i18n.translate('xpack.dataSources.hooks.useStackConnector.loadError', {
            defaultMessage: 'Failed to load connector details',
          }),
        });
      },
    }
  );

  return {
    stackConnector,
    isLoading,
    error,
  };
};
