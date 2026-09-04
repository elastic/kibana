/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';

import { useApplicationConnectionsService } from './use_application_connections_service';
import { queryKeys } from '../constants/query_keys';
import type {
  BulkConnectionTarget,
  BulkRevokeConnectionsResponse,
} from '../service/application_connections_api_client';

interface RevokeConnectionsParams {
  connections: BulkConnectionTarget[];
  reason?: string;
}

export const useRevokeConnections = () => {
  const queryClient = useQueryClient();
  const apiClient = useApplicationConnectionsService();

  const { mutateAsync, isLoading } = useMutation<
    BulkRevokeConnectionsResponse,
    Error,
    RevokeConnectionsParams
  >({
    mutationFn: ({ connections, reason }) => apiClient.bulkRevokeConnections(connections, reason),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applicationConnections.all });
    },
  });

  return { revokeConnections: mutateAsync, isRevoking: isLoading };
};
