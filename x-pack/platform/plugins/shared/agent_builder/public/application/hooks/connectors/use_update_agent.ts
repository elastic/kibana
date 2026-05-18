/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderAgentById } from '../agents/use_agent_by_id';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

interface UpdateAgentMutationVariables {
  agentId: string;
  updates: { connector_ids?: string[] };
}

type UpdateAgentMutationOptions = UseMutationOptions<void, Error, UpdateAgentMutationVariables>;

interface UseUpdateAgentProps {
  agentId: string;
  onSuccess?: UpdateAgentMutationOptions['onSuccess'];
  onError?: UpdateAgentMutationOptions['onError'];
}

export const useUpdateAgent = ({ agentId, onSuccess, onError }: UseUpdateAgentProps) => {
  const { agent } = useAgentBuilderAgentById(agentId);
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  const handleSuccess = useCallback<NonNullable<UpdateAgentMutationOptions['onSuccess']>>(
    (data, variables, context) => {
      addSuccessToast({ title: labels.connectors.assignConnectorSuccessToast });
      onSuccess?.(data, variables, context);
    },
    [addSuccessToast, onSuccess]
  );

  const handleError = useCallback<NonNullable<UpdateAgentMutationOptions['onError']>>(
    (error, variables, context) => {
      addErrorToast({
        title: labels.connectors.assignConnectorErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
      onError?.(error, variables, context);
    },
    [addErrorToast, onError]
  );

  const { mutateAsync, isLoading } = useMutation<void, Error, UpdateAgentMutationVariables>({
    mutationFn: async ({ agentId: id, updates }) => {
      await agentService.update(id, { configuration: updates });
    },
    onSuccess: handleSuccess,
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
    },
  });

  const updateAgent = useCallback(
    (updates: { connector_ids?: string[] }) => {
      if (!agent) return Promise.resolve();
      return mutateAsync({ agentId, updates });
    },
    [agent, agentId, mutateAsync]
  );

  return { updateAgent, isLoading };
};
