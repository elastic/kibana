/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOnechatServices } from '../use_onechat_service';
import { queryKeys } from '../../query_keys';

export interface UseAgentDeleteOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAgentDelete({ onSuccess, onError }: UseAgentDeleteOptions = {}) {
  const { agentProfilesService } = useOnechatServices();
  const queryClient = useQueryClient();

  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => {
      if (!agentId) {
        throw new Error('Agent ID is required for delete');
      }
      return agentProfilesService.delete(agentId);
    },
    onSuccess: (result, agentId) => {
      // Invalidate specific agent and agent profiles list
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.all });
      onSuccess?.();
    },
    onError: (err: Error) => {
      onError?.(err);
    },
  });

  return {
    deleteAgent: deleteAgentMutation.mutate,
    isDeleting: deleteAgentMutation.isLoading,
    error: deleteAgentMutation.error,
  };
}
