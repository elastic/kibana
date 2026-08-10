/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { RevokeOAuthClientResponse } from '../../../../common/http_api/oauth_clients';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

interface RevokeOAuthClientVariables {
  clientId: string;
  reason?: string;
}

export const useRevokeOAuthClient = () => {
  const queryClient = useQueryClient();
  const { oauthClientsService } = useAgentBuilderServices();

  const { mutateAsync, isLoading } = useMutation<
    RevokeOAuthClientResponse,
    Error,
    RevokeOAuthClientVariables
  >({
    mutationFn: ({ clientId, reason }) => oauthClientsService.revoke(clientId, { reason }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.oauthClients.all }),
  });

  return { revokeOAuthClient: mutateAsync, isRevoking: isLoading };
};
