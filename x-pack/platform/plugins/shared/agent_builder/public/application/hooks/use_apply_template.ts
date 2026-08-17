/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';

export const useApplyTemplate = (conversationId: string | undefined) => {
  const queryClient = useQueryClient();
  const { conversationsService } = useAgentBuilderServices();

  return useCallback(
    async (templateId: string) => {
      if (!conversationId) return;
      await conversationsService.applyTemplate({ conversationId, templateId });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
    },
    [conversationId, conversationsService, queryClient]
  );
};
