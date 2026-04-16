/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useState, useCallback } from 'react';
import type { MemoryType, MemoryStatus } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export const useMemoryList = () => {
  const { memoryService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();
  const [typeFilter, setTypeFilter] = useState<MemoryType | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<MemoryStatus | undefined>(undefined);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const from = pageIndex * pageSize;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.memory.list(typeFilter, statusFilter, pageIndex, pageSize),
    queryFn: () =>
      memoryService.list({
        type: typeFilter,
        status: statusFilter,
        size: pageSize,
        from,
      }),
    onError: () => {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.memory.list.errorToast', {
          defaultMessage: 'Failed to load memories',
        }),
      });
    },
  });

  const memories = data?.results ?? [];
  const total = data?.total ?? 0;

  return {
    memories,
    total,
    isLoading,
    error,
    refetch,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
  };
};

export const useMemoryGet = (id: string | undefined) => {
  const { memoryService } = useAgentBuilderServices();

  return useQuery({
    enabled: !!id,
    queryKey: queryKeys.memory.byId(id),
    queryFn: () => memoryService.get(id!),
  });
};

export const useMemoryUpdate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: () => void;
} = {}) => {
  const { memoryService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof memoryService.update>[1] }) =>
      memoryService.update(id, body),
    onSuccess: (_data, { id }) => {
      addSuccessToast({
        title: i18n.translate('xpack.agentBuilder.memory.update.successToast', {
          defaultMessage: 'Memory updated',
        }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.byId(id) });
      onSuccess?.();
    },
    onError: () => {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.memory.update.errorToast', {
          defaultMessage: 'Failed to update memory',
        }),
      });
      onError?.();
    },
  });
};

export const useMemoryDelete = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: () => void;
} = {}) => {
  const { memoryService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  return useMutation({
    mutationFn: (id: string) => memoryService.delete(id),
    onSuccess: () => {
      addSuccessToast({
        title: i18n.translate('xpack.agentBuilder.memory.delete.successToast', {
          defaultMessage: 'Memory deleted',
        }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      onSuccess?.();
    },
    onError: () => {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.memory.delete.errorToast', {
          defaultMessage: 'Failed to delete memory',
        }),
      });
      onError?.();
    },
  });
};

export const useMemoryDeleteAll = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: () => void;
} = {}) => {
  const { memoryService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  return useMutation({
    mutationFn: () => memoryService.deleteAll(),
    onSuccess: (data) => {
      addSuccessToast({
        title: i18n.translate('xpack.agentBuilder.memory.deleteAll.successToast', {
          defaultMessage: 'All memories deleted ({count})',
          values: { count: data.deleted },
        }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      onSuccess?.();
    },
    onError: () => {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.memory.deleteAll.errorToast', {
          defaultMessage: 'Failed to delete all memories',
        }),
      });
      onError?.();
    },
  });
};

export const useMemoryCreate = ({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError?: () => void;
} = {}) => {
  const { memoryService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  return useMutation({
    mutationFn: (body: Parameters<typeof memoryService.create>[0]) => memoryService.create(body),
    onSuccess: () => {
      addSuccessToast({
        title: i18n.translate('xpack.agentBuilder.memory.create.successToast', {
          defaultMessage: 'Memory created',
        }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      onSuccess?.();
    },
    onError: () => {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.memory.create.errorToast', {
          defaultMessage: 'Failed to create memory',
        }),
      });
      onError?.();
    },
  });
};

export const useMemoryGraph = (id: string | undefined, depth: number = 2) => {
  const { memoryService } = useAgentBuilderServices();

  return useQuery({
    enabled: !!id,
    queryKey: queryKeys.memory.graph(id, depth),
    queryFn: () => memoryService.getGraph(id!, { depth }),
  });
};

export const useMemoryConsolidation = () => {
  const { memoryService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();

  const [isTriggering, setIsTriggering] = useState(false);

  const triggerConsolidation = useCallback(async () => {
    setIsTriggering(true);
    try {
      await memoryService.triggerConsolidation();
      addSuccessToast({
        title: i18n.translate('xpack.agentBuilder.memory.consolidation.successToast', {
          defaultMessage: 'Memory consolidation triggered',
        }),
      });
    } catch {
      addErrorToast({
        title: i18n.translate('xpack.agentBuilder.memory.consolidation.errorToast', {
          defaultMessage: 'Failed to trigger memory consolidation',
        }),
      });
    } finally {
      setIsTriggering(false);
    }
  }, [memoryService, addSuccessToast, addErrorToast]);

  return { triggerConsolidation, isTriggering };
};
