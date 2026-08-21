/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useCallback } from 'react';
import type {
  OAuthClientResource,
  ListOAuthResourcesResponse,
} from '../../../../common/http_api/oauth_clients';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';

const EMPTY_RESOURCES: OAuthClientResource[] = [];

export const useOAuthResources = () => {
  const { oauthClientsService } = useAgentBuilderServices();

  const select = useCallback((data: ListOAuthResourcesResponse) => data.resources, []);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.oauthClients.resources,
    queryFn: () => oauthClientsService.listResources(),
    select,
  });

  return { resources: data ?? EMPTY_RESOURCES, isLoading };
};
