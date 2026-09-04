/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  UpdateOAuthClientPayload,
  UpdateOAuthClientResponse,
} from '../../../../common/http_api/oauth_clients';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

interface UpdateOAuthClientVariables {
  clientId: string;
  payload: UpdateOAuthClientPayload;
}

export const useUpdateOAuthClient = () => {
  const queryClient = useQueryClient();
  const { oauthClientsService } = useAgentBuilderServices();

  const { mutateAsync, isLoading } = useMutation<
    UpdateOAuthClientResponse,
    Error,
    UpdateOAuthClientVariables
  >({
    mutationFn: ({ clientId, payload }) => oauthClientsService.update(clientId, payload),
    onSettled: (_response, _error, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.oauthClients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.oauthClients.byId(clientId) });
    },
  });

  return { updateOAuthClient: mutateAsync, isUpdating: isLoading };
};
