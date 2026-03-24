/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../../../hooks/use_kibana';
import type { MemoryEntry, MemoryTreeNode, MemorySearchResult, MemoryVersionRecord } from './types';

const MEMORY_BASE = '/internal/streams/memory';

const memoryKeys = {
  all: ['memory'] as const,
  tree: ['memory', 'tree'] as const,
  search: (query: string) => ['memory', 'search', query] as const,
  byId: (id: string) => ['memory', 'entry', id] as const,
  history: (entryId: string) => ['memory', 'history', entryId] as const,
};

export const useMemoryTree = () => {
  const { core } = useKibana();
  return useQuery({
    queryKey: memoryKeys.tree,
    queryFn: () => core.http.get<{ tree: MemoryTreeNode[] }>(`${MEMORY_BASE}/tree`),
  });
};

export const useMemoryEntry = (entryId?: string) => {
  const { core } = useKibana();
  return useQuery({
    queryKey: memoryKeys.byId(entryId!),
    queryFn: () => core.http.get<MemoryEntry>(`${MEMORY_BASE}/entries/${entryId}`),
    enabled: !!entryId,
  });
};

export const useMemorySearch = (query: string) => {
  const { core } = useKibana();
  return useQuery({
    queryKey: memoryKeys.search(query),
    queryFn: () =>
      core.http.post<{ results: MemorySearchResult[] }>(`${MEMORY_BASE}/search`, {
        body: JSON.stringify({ query }),
      }),
    enabled: query.length >= 2,
  });
};

export const useMemoryHistory = (entryId?: string) => {
  const { core } = useKibana();
  return useQuery({
    queryKey: memoryKeys.history(entryId!),
    queryFn: () =>
      core.http.get<{ history: MemoryVersionRecord[] }>(
        `${MEMORY_BASE}/entries/${entryId}/history`
      ),
    enabled: !!entryId,
  });
};

export const useMemoryMutations = () => {
  const { core } = useKibana();
  const queryClient = useQueryClient();

  const invalidateMemory = () => {
    queryClient.invalidateQueries({ queryKey: memoryKeys.all });
  };

  const createEntry = useMutation({
    mutationFn: (params: { path: string; title: string; content: string; tags?: string[] }) =>
      core.http.post<MemoryEntry>(`${MEMORY_BASE}/entries`, {
        body: JSON.stringify(params),
      }),
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
    }) =>
      core.http.put<MemoryEntry>(`${MEMORY_BASE}/entries/${id}`, {
        body: JSON.stringify(params),
      }),
    onSuccess: invalidateMemory,
  });

  const deleteEntry = useMutation({
    mutationFn: (id: string) =>
      core.http.delete<{ deleted: boolean }>(`${MEMORY_BASE}/entries/${id}`),
    onSuccess: invalidateMemory,
  });

  const rollbackEntry = useMutation({
    mutationFn: ({ entryId, version }: { entryId: string; version: number }) =>
      core.http.post<MemoryEntry>(`${MEMORY_BASE}/entries/${entryId}/rollback`, {
        body: JSON.stringify({ version }),
      }),
    onSuccess: invalidateMemory,
  });

  return { createEntry, updateEntry, deleteEntry, rollbackEntry };
};
