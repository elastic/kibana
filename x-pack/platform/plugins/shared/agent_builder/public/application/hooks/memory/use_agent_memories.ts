/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

/** The current user's short-term memories with one agent, newest first. */
export const useAgentMemories = ({ agentId }: { agentId: string }) => {
  const { memoryService } = useAgentBuilderServices();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.memory.byAgent(agentId),
    queryFn: () => memoryService.list({ agentId }),
  });

  return { memories: data?.results ?? [], isLoading, error };
};

export const useDeleteAgentMemory = ({
  agentId,
  onSuccess,
  onError,
}: {
  agentId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();
  const { memoryService } = useAgentBuilderServices();

  const { mutate, isLoading } = useMutation({
    mutationFn: (id: string) => memoryService.delete({ id }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.memory.byAgent(agentId) }),
    onSuccess,
    onError,
  });

  return { deleteMemory: mutate, isDeleting: isLoading };
};

export const useDeleteAllAgentMemories = ({
  agentId,
  onSuccess,
  onError,
}: {
  agentId: string;
  onSuccess?: (deleted: number) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();
  const { memoryService } = useAgentBuilderServices();

  const { mutate, isLoading } = useMutation({
    mutationFn: () => memoryService.deleteAll({ agentId }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.memory.byAgent(agentId) }),
    onSuccess: ({ deleted }) => onSuccess?.(deleted),
    onError,
  });

  return { deleteAllMemories: mutate, isDeletingAll: isLoading };
};
