/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import {
  stateBlocksNewActivity,
  type SignificantEventsMaintenanceStatus,
  type SignificantEventsMaintenanceSummary,
} from '@kbn/significant-events-plugin/common';
import { getActivityBlockTooltip } from '../../components/significant_events/significant_events_discovery/components/shared/translations';
import { useKibana } from '../use_kibana';
import { getFormattedError } from '../../util/errors';

const MAINTENANCE_STATUS_QUERY_KEY = ['significantEventsMaintenanceStatus'] as const;

const PAUSE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.maintenance.pauseSuccessToastTitle',
  { defaultMessage: 'Paused Significant Events activity' }
);

const PAUSE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.maintenance.pauseErrorToastTitle',
  { defaultMessage: 'Failed to pause Significant Events activity' }
);

const RESUME_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.maintenance.resumeSuccessToastTitle',
  { defaultMessage: 'Resumed Significant Events activity' }
);

const RESUME_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.maintenance.resumeErrorToastTitle',
  { defaultMessage: 'Failed to resume Significant Events activity' }
);

const PAUSE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.maintenance.pausePartialToastTitle',
  { defaultMessage: 'Paused, but some items could not be stopped' }
);

const RESUME_WARNINGS_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.maintenance.resumeWarningsToastTitle',
  { defaultMessage: 'Resumed Significant Events activity with warnings' }
);

const partialFailuresText = (count: number) =>
  i18n.translate('xpack.streams.significantEventsDiscovery.maintenance.partialFailuresText', {
    defaultMessage:
      '{count, plural, one {# operation} other {# operations}} could not be completed. Check the Kibana server logs for details.',
    values: { count },
  });

// The state is global (deployment-wide) and can be changed from another tab,
// space, or user, so poll periodically and on window focus to avoid acting on a
// stale status.
const MAINTENANCE_STATUS_REFETCH_INTERVAL_MS = 30_000;

/** Reads the persisted maintenance state. Cached under a shared key so every
 * consumer (settings control, discovery callout, toggles) sees a single source
 * of truth. */
export const useMaintenanceStatus = () => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return useQuery<SignificantEventsMaintenanceStatus, Error>({
    queryKey: MAINTENANCE_STATUS_QUERY_KEY,
    queryFn: ({ signal }: QueryFunctionContext) =>
      streamsRepositoryClient.fetch('GET /internal/significant_events/maintenance/_status', {
        signal: signal ?? null,
      }),
    refetchInterval: MAINTENANCE_STATUS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
};

/**
 * Whether new Significant Events activity should be blocked in the UI.
 * `isBlocked` is true only once status is known and blocking.
 * `blocksActivity` is also true while status is loading or the status query
 * failed (pessimistic) so enable toggles / run buttons do not look available
 * when pause state is unknown.
 * `activityBlockTooltip` explains why controls are disabled (loading, error, or paused).
 */
export const useBlocksNewActivity = (): {
  blocksActivity: boolean;
  isBlocked: boolean;
  isLoading: boolean;
  isError: boolean;
  status: SignificantEventsMaintenanceStatus | undefined;
  activityBlockTooltip: string | undefined;
} => {
  const { data: status, isLoading, isError } = useMaintenanceStatus();
  const isBlocked = status ? stateBlocksNewActivity(status.state) : false;
  const blocksActivity = isLoading || isError || isBlocked;
  const activityBlockTooltip = getActivityBlockTooltip({ isLoading, isError, isBlocked });
  return { blocksActivity, isBlocked, isLoading, isError, status, activityBlockTooltip };
};

/** Pause and resume actions. Each is a single synchronous API call that returns
 * the resulting summary; both invalidate the shared status query so the UI
 * reflects the new state (and re-enables/disables the guarded toggles). */
export const useSignificantEventsMaintenanceActions = () => {
  const {
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const invalidateStatus = () =>
    queryClient.invalidateQueries({ queryKey: MAINTENANCE_STATUS_QUERY_KEY });

  const pauseMutation = useMutation<SignificantEventsMaintenanceSummary, Error, void>({
    mutationFn: () =>
      streamsRepositoryClient.fetch('POST /internal/significant_events/maintenance/_pause', {
        signal: null,
      }),
    onSuccess: (summary) => {
      if (summary.partialFailures.length > 0) {
        toasts.addWarning({
          title: PAUSE_PARTIAL_TOAST_TITLE,
          text: partialFailuresText(summary.partialFailures.length),
        });
      } else {
        toasts.addSuccess({ title: PAUSE_SUCCESS_TOAST_TITLE });
      }
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: PAUSE_ERROR_TOAST_TITLE });
    },
    onSettled: invalidateStatus,
  });

  const resumeMutation = useMutation<SignificantEventsMaintenanceSummary, Error, void>({
    mutationFn: () =>
      streamsRepositoryClient.fetch('POST /internal/significant_events/maintenance/_resume', {
        signal: null,
      }),
    onSuccess: (summary) => {
      // Resume always flips the control plane to enabled (or throws). Partial
      // re-enable failures are warnings, not a lingering paused state.
      if (summary.partialFailures.length > 0) {
        toasts.addWarning({
          title: RESUME_WARNINGS_TOAST_TITLE,
          text: partialFailuresText(summary.partialFailures.length),
        });
      } else {
        toasts.addSuccess({ title: RESUME_SUCCESS_TOAST_TITLE });
      }
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: RESUME_ERROR_TOAST_TITLE });
    },
    onSettled: invalidateStatus,
  });

  return {
    pause: () => pauseMutation.mutate(),
    resume: () => resumeMutation.mutate(),
    isPausing: pauseMutation.isLoading,
    isResuming: resumeMutation.isLoading,
  };
};
