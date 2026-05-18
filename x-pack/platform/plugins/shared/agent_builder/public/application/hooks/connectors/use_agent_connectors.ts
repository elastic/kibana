/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback, useMemo } from 'react';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderAgentById } from '../agents/use_agent_by_id';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useListConnectors } from '../tools/use_mcp_connectors';
import { useToasts } from '../use_toasts';

interface AssignMutationVariables {
  connectorId: string;
  currentIds: string[];
}

type AssignMutationOptions = UseMutationOptions<void, Error, AssignMutationVariables>;

interface UseAgentConnectorsProps {
  agentId: string;
  onSuccess?: AssignMutationOptions['onSuccess'];
  onError?: AssignMutationOptions['onError'];
}

export const useAgentConnectors = ({ agentId, onSuccess, onError }: UseAgentConnectorsProps) => {
  const { agent } = useAgentBuilderAgentById(agentId);
  const { connectors: allConnectors, isLoading, error } = useListConnectors({});
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  const assignedIds = agent?.configuration?.connector_ids;

  const assignedConnectors = useMemo(() => {
    if (assignedIds === undefined) return allConnectors;
    return allConnectors.filter((c) => assignedIds.includes(c.id));
  }, [allConnectors, assignedIds]);

  const unassignedConnectors = useMemo(
    () => allConnectors.filter((c) => !assignedIds?.includes(c.id)),
    [allConnectors, assignedIds]
  );

  const handleSuccessAssign = useCallback<NonNullable<AssignMutationOptions['onSuccess']>>(
    (data, variables, context) => {
      addSuccessToast({ title: labels.connectors.assignConnectorSuccessToast });
      onSuccess?.(data, variables, context);
    },
    [addSuccessToast, onSuccess]
  );

  const handleErrorAssign = useCallback<NonNullable<AssignMutationOptions['onError']>>(
    (err, variables, context) => {
      addErrorToast({
        title: labels.connectors.assignConnectorErrorToast,
        text: formatAgentBuilderErrorMessage(err),
      });
      onError?.(err, variables, context);
    },
    [addErrorToast, onError]
  );

  const { mutateAsync, isLoading: isAssigning } = useMutation<void, Error, AssignMutationVariables>(
    {
      mutationFn: async ({ connectorId, currentIds }) => {
        await agentService.update(agentId, {
          configuration: { connector_ids: [...currentIds, connectorId] },
        });
      },
      onSuccess: handleSuccessAssign,
      onError: handleErrorAssign,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
      },
    }
  );

  const assign = useCallback(
    (connectorId: string) => {
      if (!agent) return Promise.resolve();
      return mutateAsync({ connectorId, currentIds: agent.configuration?.connector_ids ?? [] });
    },
    [agent, mutateAsync]
  );

  return {
    assignedConnectors,
    unassignedConnectors,
    isLoading,
    error,
    assign,
    isAssigning,
  };
};
