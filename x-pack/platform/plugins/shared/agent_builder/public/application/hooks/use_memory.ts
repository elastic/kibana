/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';

export const useMemoryTree = () => {
  const { memoryService } = useAgentBuilderServices();
  return useQuery({
    queryKey: queryKeys.memory.tree,
    queryFn: () => memoryService.getTree(),
  });
};

export const useMemoryEntry = (entryId?: string) => {
  const { memoryService } = useAgentBuilderServices();
  return useQuery({
    queryKey: queryKeys.memory.byId(entryId!),
    queryFn: () => memoryService.getEntry(entryId!),
    enabled: !!entryId,
  });
};

export const useMemorySearch = (query: string) => {
  const { memoryService } = useAgentBuilderServices();
  return useQuery({
    queryKey: queryKeys.memory.search(query),
    queryFn: () => memoryService.search({ query }),
    enabled: query.length >= 2,
  });
};

export const useMemoryHistory = (entryId?: string) => {
  const { memoryService } = useAgentBuilderServices();
  return useQuery({
    queryKey: queryKeys.memory.history(entryId!),
    queryFn: () => memoryService.getHistory(entryId!),
    enabled: !!entryId,
  });
};

export const useMemoryMutations = () => {
  const { memoryService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  const invalidateMemory = () => {
    queryClient.invalidateQueries({ queryKey: ['memory'] });
  };

  const createEntry = useMutation({
    mutationFn: (params: { path: string; title: string; content: string; tags?: string[] }) =>
      memoryService.createEntry(params),
    onSuccess: invalidateMemory,
  });

  const updateEntry = useMutation({
    mutationFn: ({
      id,
      ...params
    }: {
      id: string;
      title?: string;
      content?: string;
      tags?: string[];
      change_summary?: string;
    }) => memoryService.updateEntry(id, params),
    onSuccess: invalidateMemory,
  });

  const deleteEntry = useMutation({
    mutationFn: (id: string) => memoryService.deleteEntry(id),
    onSuccess: invalidateMemory,
  });

  const rollbackEntry = useMutation({
    mutationFn: ({ entryId, version }: { entryId: string; version: number }) =>
      memoryService.rollback(entryId, version),
    onSuccess: invalidateMemory,
  });

  return { createEntry, updateEntry, deleteEntry, rollbackEntry };
};
