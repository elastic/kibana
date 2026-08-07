/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateMemoryEntryRequest,
  MemoryCategoriesResponse,
  MemoryEntry,
  MemorySetupResponse,
  MemoryStatusResponse,
  MemoryWorkflowType,
  UpdateMemoryEntryRequest,
} from '@kbn/agent-memory-common';
import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useRef } from 'react';
import {
  createMemoryEntry,
  deleteMemoryEntry,
  getMemoryCategories,
  getMemoryEntry,
  getMemoryHistory,
  getMemoryStatus,
  getRecentMemoryChanges,
  runMemoryWorkflow,
  searchMemory,
  setMemoryMaintenanceEnabled,
  setMemoryWorkflowEnabled,
  setUpMemory,
  updateMemoryEntry,
} from '../api/memory';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/** How long the setup/run poll keeps going before it gives up and asks for a refresh. */
const INSTALL_POLL_TIMEOUT_MS = 2 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

export const useMemoryStatus = () => {
  const {
    services: { http },
  } = useKibana();
  // When we first saw an install in progress, so a stuck install stops polling
  // forever instead of hammering the endpoint.
  const installingSince = useRef<number | undefined>(undefined);

  return useQuery<MemoryStatusResponse, Error>({
    queryKey: contextEngineQueryKeys.memory.status(),
    queryFn: ({ signal }) => getMemoryStatus(http, { signal }),
    // Poll only while something is actually in flight. Memory state is
    // deployment-wide, so also refetch on focus: another user, tab, or space can
    // change it underneath us.
    refetchInterval: (data) => {
      if (data?.state !== 'installing') {
        installingSince.current = undefined;
        return false;
      }
      installingSince.current ??= Date.now();
      return Date.now() - installingSince.current < INSTALL_POLL_TIMEOUT_MS
        ? POLL_INTERVAL_MS
        : false;
    },
    refetchOnWindowFocus: true,
  });
};

const useMemoryToasts = () => {
  const {
    services: { notifications },
  } = useKibana();

  return {
    onError: (title: string) => (error: Error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title,
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
    addSuccess: (title: string) => notifications.toasts.addSuccess({ title }),
    addWarning: (title: string, text: string) => notifications.toasts.addWarning({ title, text }),
  };
};

export const useSetUpMemory = () => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();
  const toasts = useMemoryToasts();

  const { mutateAsync, isLoading } = useMutation<MemorySetupResponse, Error, void>({
    mutationFn: () => setUpMemory(http),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.memory.all() });
      if (response.warnings.length > 0) {
        toasts.addWarning(
          i18n.translate('xpack.contextEngine.memory.setupPartialTitle', {
            defaultMessage: 'Memory is set up, with warnings',
          }),
          response.warnings.join(' ')
        );
        return;
      }
      // Still installing is an ordinary post-restart race, not something to
      // announce — the page flips to its in-progress state and polling finishes.
      if (response.status.state !== 'installing') {
        toasts.addSuccess(
          i18n.translate('xpack.contextEngine.memory.setupSuccessTitle', {
            defaultMessage: 'Memory is ready',
          })
        );
      }
    },
    onError: toasts.onError(
      i18n.translate('xpack.contextEngine.memory.setupErrorTitle', {
        defaultMessage: 'Unable to set up memory',
      })
    ),
  });

  return { setUp: mutateAsync, isSettingUp: isLoading };
};

export const useMemoryEntry = ({ id }: { id: string | undefined }) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery<MemoryEntry, Error>({
    queryKey: contextEngineQueryKeys.memory.entry(id ?? ''),
    queryFn: ({ signal }) => getMemoryEntry(http, { id: id!, signal }),
    enabled: Boolean(id),
  });
};

export const useMemoryCategories = ({ enabled }: { enabled: boolean }) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery<MemoryCategoriesResponse, Error>({
    queryKey: contextEngineQueryKeys.memory.categories(),
    queryFn: ({ signal }) => getMemoryCategories(http, { signal }),
    enabled,
  });
};

export const useMemorySearch = ({ query, enabled }: { query: string; enabled: boolean }) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery({
    queryKey: contextEngineQueryKeys.memory.search(query),
    queryFn: ({ signal }) => searchMemory(http, { body: { query }, signal }),
    enabled,
  });
};

export const useMemoryHistory = ({ id, enabled }: { id: string | undefined; enabled: boolean }) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery({
    queryKey: contextEngineQueryKeys.memory.history(id ?? ''),
    queryFn: ({ signal }) => getMemoryHistory(http, { id: id!, signal }),
    enabled: enabled && Boolean(id),
  });
};

export const useRecentMemoryChanges = ({ enabled }: { enabled: boolean }) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery({
    queryKey: contextEngineQueryKeys.memory.recentChanges(),
    queryFn: ({ signal }) => getRecentMemoryChanges(http, { signal }),
    enabled,
  });
};

export const useMemoryEntryMutations = () => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();
  const toasts = useMemoryToasts();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.memory.all() });

  const create = useMutation<MemoryEntry, Error, CreateMemoryEntryRequest>({
    mutationFn: (body) => createMemoryEntry(http, body),
    onSuccess: invalidate,
    onError: toasts.onError(
      i18n.translate('xpack.contextEngine.memory.createEntryErrorTitle', {
        defaultMessage: 'Unable to create memory page',
      })
    ),
  });

  const update = useMutation<MemoryEntry, Error, { id: string; body: UpdateMemoryEntryRequest }>({
    mutationFn: ({ id, body }) => updateMemoryEntry(http, { id, body }),
    onSuccess: invalidate,
    onError: toasts.onError(
      i18n.translate('xpack.contextEngine.memory.updateEntryErrorTitle', {
        defaultMessage: 'Unable to update memory page',
      })
    ),
  });

  const remove = useMutation<{ deleted: boolean }, Error, { id: string }>({
    mutationFn: ({ id }) => deleteMemoryEntry(http, { id }),
    onSuccess: invalidate,
    onError: toasts.onError(
      i18n.translate('xpack.contextEngine.memory.deleteEntryErrorTitle', {
        defaultMessage: 'Unable to delete memory page',
      })
    ),
  });

  return { create, update, remove };
};

export const useMemoryMaintenance = () => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();
  const toasts = useMemoryToasts();

  const invalidateStatus = () =>
    queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.memory.status() });

  /**
   * Per-workflow failures come back in the response body rather than as an error,
   * so surface them individually instead of failing the whole toggle.
   */
  const reportFailures = (failures: Array<{ type: MemoryWorkflowType; message: string }>) => {
    if (failures.length === 0) return;
    toasts.addWarning(
      i18n.translate('xpack.contextEngine.memory.maintenancePartialTitle', {
        defaultMessage: 'Some background jobs could not be updated',
      }),
      failures.map((failure) => `${failure.type}: ${failure.message}`).join(' ')
    );
  };

  const setAllEnabled = useMutation({
    mutationFn: ({ enabled }: { enabled: boolean }) =>
      setMemoryMaintenanceEnabled(http, { enabled }),
    onSuccess: (response) => {
      reportFailures(response.failures);
      invalidateStatus();
    },
    onError: toasts.onError(
      i18n.translate('xpack.contextEngine.memory.maintenanceErrorTitle', {
        defaultMessage: 'Unable to update background jobs',
      })
    ),
  });

  const setWorkflowEnabled = useMutation({
    mutationFn: ({ type, enabled }: { type: MemoryWorkflowType; enabled: boolean }) =>
      setMemoryWorkflowEnabled(http, { type, enabled }),
    onSuccess: (response) => {
      reportFailures(response.failures);
      invalidateStatus();
    },
    onError: toasts.onError(
      i18n.translate('xpack.contextEngine.memory.maintenanceErrorTitle', {
        defaultMessage: 'Unable to update background jobs',
      })
    ),
  });

  const runWorkflow = useMutation({
    mutationFn: ({ type }: { type: MemoryWorkflowType }) => runMemoryWorkflow(http, { type }),
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.contextEngine.memory.runWorkflowSuccessTitle', {
          defaultMessage: 'Job started',
        })
      );
      invalidateStatus();
    },
    onError: toasts.onError(
      i18n.translate('xpack.contextEngine.memory.runWorkflowErrorTitle', {
        defaultMessage: 'Unable to start the job',
      })
    ),
  });

  return { setAllEnabled, setWorkflowEnabled, runWorkflow };
};
