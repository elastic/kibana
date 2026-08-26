/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

export const useOAuthClient = (clientId: string) => {
  const { oauthClientsService } = useAgentBuilderServices();

  const { data, isLoading, error, isError } = useQuery({
    queryKey: queryKeys.oauthClients.byId(clientId),
    queryFn: () => oauthClientsService.get(clientId),
    enabled: Boolean(clientId),
  });

  return { client: data, isLoading, error, isError };
};
