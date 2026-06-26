/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';

import { useApplicationConnectionsService } from './use_application_connections_service';
import { queryKeys } from '../constants/query_keys';
import type { OAuthConnection } from '../service/application_connections_api_client';

export interface UpdateConnectionNameVariables {
  clientId: string;
  connectionId: string;
  name: string;
}

export const useUpdateConnectionName = () => {
  const queryClient = useQueryClient();
  const apiClient = useApplicationConnectionsService();

  const { mutateAsync, isLoading } = useMutation<
    OAuthConnection,
    Error,
    UpdateConnectionNameVariables
  >({
    mutationFn: ({ clientId, connectionId, name }) =>
      apiClient.updateConnection(clientId, connectionId, { name }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applicationConnections.all });
    },
  });

  return { updateConnectionName: mutateAsync, isUpdating: isLoading };
};
