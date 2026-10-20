/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

interface DeleteOAuthClientVariables {
  clientId: string;
}

export const useDeleteOAuthClient = () => {
  const queryClient = useQueryClient();
  const { oauthClientsService } = useAgentBuilderServices();

  const { mutateAsync, isLoading } = useMutation<void, Error, DeleteOAuthClientVariables>({
    mutationFn: ({ clientId }) => oauthClientsService.delete(clientId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.oauthClients.all }),
  });

  return { deleteOAuthClient: mutateAsync, isDeleting: isLoading };
};
