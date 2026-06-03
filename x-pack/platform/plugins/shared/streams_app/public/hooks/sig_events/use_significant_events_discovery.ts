/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { WorkflowStatus } from '@kbn/streams-schema';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useKibana } from '../use_kibana';
import { useSignificantEventsDiscoveryApi } from './use_significant_events_discovery_api';

const POLL_INTERVAL_MS = 3000;

const isTerminalStatus = (status: string) =>
  status === WorkflowStatus.Completed ||
  status === WorkflowStatus.Failed ||
  status === WorkflowStatus.Canceled;

export const useSignificantEventsDiscovery = () => {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();

  const {
    triggerSignificantEventsDiscovery,
    cancelSignificantEventsDiscovery,
    getSignificantEventsDiscoveryStatus,
  } = useSignificantEventsDiscoveryApi();

  // Local status state — set optimistically on trigger AND updated from server polling.
  // Mirrors the onboardingState pattern in useKnowledgeIndicatorsOnboarding.
  const [SignificantEventsDiscoveryStatus, setSignificantEventsDiscoveryStatus] =
    useState<WorkflowStatus | null>(null);

  // Tracks the previous server-confirmed status for toast transition detection.
  // null = no server status observed yet; used to suppress spurious toasts on mount.
  const previousStatusRef = useRef<WorkflowStatus | null>(null);

  const { mutate: triggerMutate } = useMutation({
    mutationFn: triggerSignificantEventsDiscovery,
    onError: (error: Error) => {
      setSignificantEventsDiscoveryStatus(null);
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.streams.SignificantEventsDiscoveryWorkflow.triggerErrorTitle',
          {
            defaultMessage: 'Failed to start discovery pipeline',
          }
        ),
      });
    },
  });

  const { mutate: cancelMutate } = useMutation({
    mutationFn: cancelSignificantEventsDiscovery,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.streams.SignificantEventsDiscoveryWorkflow.cancelErrorTitle', {
          defaultMessage: 'Failed to cancel discovery pipeline',
        }),
      });
    },
  });

  // isRunning is declared before useQuery so it can drive refetchInterval.
  // It includes the optimistic InProgress state set by handleRun so polling
  // continues even before the server confirms the new execution.
  const isRunning =
    SignificantEventsDiscoveryStatus !== null &&
    !isTerminalStatus(SignificantEventsDiscoveryStatus) &&
    SignificantEventsDiscoveryStatus !== WorkflowStatus.NotStarted;

  // queryFn is a pure fetch — no side effects. All subscribers share the same
  // cached data via the query key. React Query deduplicates the network request
  // across all mounted consumers; side effects are handled via useEffect below
  // so every subscriber reacts correctly to the shared result.
  const { data } = useQuery({
    queryKey: ['significant_events_discovery_status'],
    queryFn: getSignificantEventsDiscoveryStatus,
    refetchInterval: isRunning ? POLL_INTERVAL_MS : false,
  });

  // Runs in every subscriber when the polled status changes. Updates local state
  // and fires transition toasts when moving FROM a non-terminal TO a terminal status.
  useEffect(() => {
    const status = data?.status;
    if (!status) return;

    setSignificantEventsDiscoveryStatus(status);

    const previous = previousStatusRef.current;
    previousStatusRef.current = status;

    // Only toast on transitions — never on first mount (previous === null).
    if (previous === null || !isTerminalStatus(status) || isTerminalStatus(previous)) return;

    if (status === WorkflowStatus.Completed) {
      toasts.addSuccess({
        title: i18n.translate('xpack.streams.SignificantEventsDiscoveryWorkflow.completedTitle', {
          defaultMessage: 'Significant events discovery completed',
        }),
        text: i18n.translate('xpack.streams.SignificantEventsDiscoveryWorkflow.completedText', {
          defaultMessage: 'New significant events are ready for analysis.',
        }),
      });
    } else if (status === WorkflowStatus.Failed) {
      toasts.addDanger({
        title: i18n.translate('xpack.streams.SignificantEventsDiscoveryWorkflow.failedTitle', {
          defaultMessage: 'Significant events discovery failed',
        }),
      });
    } else {
      toasts.addDanger({
        title: i18n.translate('xpack.streams.SignificantEventsDiscoveryWorkflow.canceledTitle', {
          defaultMessage: 'Significant events discovery canceled',
        }),
      });
    }
  }, [data?.status, toasts]);

  const handleRun = useCallback(() => {
    // Set optimistic InProgress so isRunning = true immediately (shows cancel button,
    // starts polling). previousStatusRef stays as-is so the first server response
    // that confirms InProgress → Completed correctly fires the completion toast.
    previousStatusRef.current = WorkflowStatus.InProgress;
    setSignificantEventsDiscoveryStatus(WorkflowStatus.InProgress);
    triggerMutate();
  }, [triggerMutate]);

  const handleCancel = useCallback(() => {
    cancelMutate();
  }, [cancelMutate]);

  return useMemo(
    () => ({ isRunning, handleRun, handleCancel }),
    [isRunning, handleRun, handleCancel]
  );
};
