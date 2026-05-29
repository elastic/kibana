/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useKibana } from '../use_kibana';

const WORKFLOWS_API_VERSION = '2023-10-31';
const POLL_INTERVAL_MS = 3000;
const STORAGE_KEY = 'sig_events_discovery_execution_id';

// Status values from @kbn/workflows ExecutionStatus enum —
// imported by value to avoid adding the package as a dep.
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'skipped', 'timed_out']);

// Module-level deduplication: prevents duplicate toasts when multiple hook
// instances are mounted simultaneously (one per tab on the sig events page).
const notifiedExecutions = new Set<string>();

interface WorkflowExecution {
  id: string;
  status: string;
}

/**
 * Manages the SigEvents discovery orchestrator workflow lifecycle:
 * - Triggers the orchestrator via the streams route
 * - Polls execution status via the public workflows API
 * - Persists executionId in localStorage so polling survives page refresh
 * - Deduplicates across components via React Query's shared cache
 */
export const useDiscoveryWorkflow = () => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const [executionId, setExecutionId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );

  // Track the previous status to fire toasts only on transitions.
  const previousStatusRef = useRef<string | null>(null);

  // Sync executionId across hook instances (e.g. multiple tabs on the same page).
  // When any instance stores a new executionId, others pick it up via the storage event.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setExecutionId(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const { data: execution, isError: isPollingError } = useQuery<WorkflowExecution | null>({
    queryKey: ['sig_events_discovery_execution', executionId],
    queryFn: async () => {
      if (!executionId) return null;
      return http.get<WorkflowExecution>(
        `/api/workflows/executions/${encodeURIComponent(executionId)}`,
        { version: WORKFLOWS_API_VERSION }
      );
    },
    enabled: !!executionId,
    refetchInterval: (data) => {
      if (!data || TERMINAL_STATUSES.has(data.status)) return false;
      return POLL_INTERVAL_MS;
    },
  });

  // Fire toasts and clear state when execution reaches a terminal status.
  useEffect(() => {
    if (!execution) return;
    const { id, status } = execution;
    if (!TERMINAL_STATUSES.has(status)) return;
    if (previousStatusRef.current === status) return;
    previousStatusRef.current = status;

    localStorage.removeItem(STORAGE_KEY);
    setExecutionId(null);

    // Guard against duplicate toasts when multiple hook instances are mounted.
    if (notifiedExecutions.has(id)) return;
    notifiedExecutions.add(id);

    if (status === 'completed') {
      toasts.addSuccess({
        title: i18n.translate('xpack.streams.discoveryWorkflow.completedTitle', {
          defaultMessage: 'Discovery pipeline completed',
        }),
        text: i18n.translate('xpack.streams.discoveryWorkflow.completedText', {
          defaultMessage: 'Detection, discovery, and triage finished. Results are now available.',
        }),
      });
    } else {
      toasts.addDanger({
        title: i18n.translate('xpack.streams.discoveryWorkflow.failedTitle', {
          defaultMessage: 'Discovery pipeline {status}',
          values: { status },
        }),
      });
    }
  }, [execution, toasts]);

  // Clear stale executionId when polling fails (e.g., execution not found after server restart).
  useEffect(() => {
    if (!isPollingError || !executionId) return;
    localStorage.removeItem(STORAGE_KEY);
    setExecutionId(null);
    toasts.addDanger({
      title: i18n.translate('xpack.streams.discoveryWorkflow.pollErrorTitle', {
        defaultMessage: 'Failed to check discovery status',
      }),
      text: i18n.translate('xpack.streams.discoveryWorkflow.pollErrorText', {
        defaultMessage: 'Could not retrieve the execution status. The pipeline may have expired.',
      }),
    });
  }, [isPollingError, executionId, toasts]);

  const handleRun = useCallback(async () => {
    try {
      // No abort signal: this is a fire-and-track mutation. Aborting the POST would
      // silently start the server workflow with no client tracking.
      const response = await streamsRepositoryClient.fetch(
        'POST /internal/streams/significant_events/discovery/_run',
        { params: { body: {} } }
      );

      const newExecutionId = response.executionId;
      localStorage.setItem(STORAGE_KEY, newExecutionId);
      previousStatusRef.current = null;
      setExecutionId(newExecutionId);
    } catch (err) {
      toasts.addError(err as Error, {
        title: i18n.translate('xpack.streams.discoveryWorkflow.triggerErrorTitle', {
          defaultMessage: 'Failed to start discovery pipeline',
        }),
      });
    }
  }, [streamsRepositoryClient, toasts]);

  // Running = we have an executionId AND status is not yet terminal (or not yet loaded).
  const isRunning = !!executionId && (!execution || !TERMINAL_STATUSES.has(execution.status));

  return { isRunning, handleRun };
};
