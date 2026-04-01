/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { HeartbeatCreateRequest, HeartbeatUpdateRequest } from '../../../../common/heartbeats';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';

/**
 * Fetch all heartbeats for a given agent.
 */
export const useHeartbeats = (agentId: string) => {
  const { heartbeatsService } = useAgentBuilderServices();

  return useQuery({
    queryKey: queryKeys.heartbeats.byAgent(agentId),
    queryFn: () => heartbeatsService.list(agentId),
    enabled: Boolean(agentId),
  });
};

/**
 * Mutations for heartbeat CRUD + pause/resume.
 * Automatically invalidates the heartbeat list on success.
 */
export const useHeartbeatMutations = (agentId: string) => {
  const { heartbeatsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.heartbeats.byAgent(agentId) });

  const createHeartbeat = useMutation({
    mutationFn: (body: HeartbeatCreateRequest) => heartbeatsService.create(agentId, body),
    onSuccess: invalidateList,
  });

  const updateHeartbeat = useMutation({
    mutationFn: ({ heartbeatId, body }: { heartbeatId: string; body: HeartbeatUpdateRequest }) =>
      heartbeatsService.update(agentId, heartbeatId, body),
    onSuccess: invalidateList,
  });

  const deleteHeartbeat = useMutation({
    mutationFn: (heartbeatId: string) => heartbeatsService.delete(agentId, heartbeatId),
    onSuccess: invalidateList,
  });

  const pauseHeartbeat = useMutation({
    mutationFn: (heartbeatId: string) => heartbeatsService.pause(agentId, heartbeatId),
    onSuccess: invalidateList,
  });

  const resumeHeartbeat = useMutation({
    mutationFn: (heartbeatId: string) => heartbeatsService.resume(agentId, heartbeatId),
    onSuccess: invalidateList,
  });

  return {
    createHeartbeat,
    updateHeartbeat,
    deleteHeartbeat,
    pauseHeartbeat,
    resumeHeartbeat,
  };
};
