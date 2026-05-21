/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { OAuthClient } from '@kbn/agent-builder-common';
import { useCallback } from 'react';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';
import type { ListOAuthClientsResponse } from '../../../../common/http_api/oauth_clients';

const EMPTY_CLIENTS: OAuthClient[] = [];

export const useOAuthClients = () => {
  const { oauthClientsService } = useAgentBuilderServices();

  const select = useCallback((data: ListOAuthClientsResponse) => {
    return data.clients;
  }, []);

  const { data, isLoading, error, isFetched } = useQuery({
    queryKey: queryKeys.oauthClients.all,
    queryFn: () => oauthClientsService.list(),
    select,
  });

  return { clients: data ?? EMPTY_CLIENTS, isLoading, error, isFetched };
};
