/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { mutationKeys } from '../mutation_keys';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useToasts } from './use_toasts';

/**
 * Creates an empty conversation for an agent and caches it.
 * Each caller gets its own loading state, so a PDF paste does not lock the editor like Submit does.
 */
export const useCreateConversation = () => {
  const { conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addErrorToast } = useToasts();

  const { mutateAsync: createConversation, isLoading: isCreatingConversation } = useMutation({
    mutationKey: mutationKeys.createConversation,
    mutationFn: (agentId: string) => conversationsService.create({ agentId }),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.conversations.byId(created.id), created);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
    },
    onError: (error) => addErrorToast({ title: formatAgentBuilderErrorMessage(error) }),
  });

  return { createConversation, isCreatingConversation };
};
