/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  CreateOAuthClientPayload,
  CreateOAuthClientResponse,
} from '../../../../common/http_api/oauth_clients';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

export const useCreateOAuthClient = () => {
  const queryClient = useQueryClient();
  const { oauthClientsService } = useAgentBuilderServices();

  const { mutateAsync, isLoading } = useMutation<
    CreateOAuthClientResponse,
    Error,
    CreateOAuthClientPayload
  >({
    mutationFn: (payload) => oauthClientsService.create(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.oauthClients.all }),
  });

  return { createOAuthClient: mutateAsync, isCreating: isLoading };
};
