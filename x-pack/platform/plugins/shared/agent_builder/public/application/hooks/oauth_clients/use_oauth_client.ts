/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useQuery } from '@kbn/react-query';
import { useEffect } from 'react';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export const useOAuthClient = (clientId: string) => {
  const { oauthClientsService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();

  const { data, isLoading, error, isError } = useQuery({
    queryKey: queryKeys.oauthClients.byId(clientId),
    queryFn: () => oauthClientsService.get(clientId),
    enabled: Boolean(clientId),
  });

  useEffect(() => {
    if (!isError) return;
    addErrorToast({
      title: labels.tools.mcpClients.loadMcpClientErrorMessage,
      text: formatAgentBuilderErrorMessage(error),
    });
  }, [isError, error, addErrorToast]);

  return { client: data, isLoading, error, isError };
};
