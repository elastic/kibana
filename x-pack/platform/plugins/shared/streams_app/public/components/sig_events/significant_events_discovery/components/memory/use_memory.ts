/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@kbn/react-query';
import { useKibana } from '../../../../../hooks/use_kibana';
import type {
  MemoryEntry,
  MemoryTreeNode,
  MemorySearchResult,
  MemoryVersionRecord,
  MemoryQuestion,
} from './types';

const MEMORY_BASE = '/internal/streams/memory';

const memoryKeys = {
  all: ['memory'] as const,
  tree: ['memory', 'tree'] as const,
  search: (query: string) => ['memory', 'search', query] as const,
  byId: (id: string) => ['memory', 'entry', id] as const,
  history: (entryId: string) => ['memory', 'history', entryId] as const,
  version: (entryId: string, version: number) => ['memory', 'version', entryId, version] as const,
  recentChanges: ['memory', 'recent-changes'] as const,
  questions: ['memory', 'questions'] as const,
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

export const useMemoryVersion = (entryId?: string, version?: number) => {
  const { core } = useKibana();
  return useQuery({
    queryKey: memoryKeys.version(entryId!, version!),
    queryFn: () =>
      core.http.get<MemoryVersionRecord>(`${MEMORY_BASE}/entries/${entryId}/history/${version}`),
    enabled: !!entryId && version !== undefined,
  });
};

export const useRecentChanges = () => {
  const { core } = useKibana();
  return useQuery({
    queryKey: memoryKeys.recentChanges,
    queryFn: () =>
      core.http.get<{ changes: MemoryVersionRecord[] }>(`${MEMORY_BASE}/recent-changes`),
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

const useMemoryTaskAction = (endpoint: string): UseMutationResult<unknown, unknown, void> => {
  const { core } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      core.http.post(endpoint, {
        body: JSON.stringify({ action: 'schedule' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all });
    },
  });
};

export const useScrapeConversations = () => {
  return useMemoryTaskAction(`${MEMORY_BASE}/_scrape_conversations`);
};

export const useConsolidateMemory = () => {
  return useMemoryTaskAction(`${MEMORY_BASE}/_consolidate`);
};

export const useOpenQuestions = () => {
  const { core } = useKibana();
  return useQuery({
    queryKey: memoryKeys.questions,
    queryFn: () => core.http.get<{ questions: MemoryQuestion[] }>(`${MEMORY_BASE}/questions`),
  });
};

export const useAnswerQuestion = () => {
  const { core } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) =>
      core.http.post<{ question: MemoryQuestion; taskScheduled: boolean }>(
        `${MEMORY_BASE}/questions/${id}/answer`,
        { body: JSON.stringify({ answer }) }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all });
    },
  });
};

export const useDismissQuestion = () => {
  const { core } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      core.http.post<{ dismissed: boolean }>(`${MEMORY_BASE}/questions/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.questions });
    },
  });
};
