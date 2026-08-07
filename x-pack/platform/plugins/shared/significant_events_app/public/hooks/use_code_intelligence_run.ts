/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import { useAbortController } from '@kbn/react-hooks';
import { getFormattedError } from '../util/errors';
import { useKibana } from './use_kibana';
import { DISCOVERY_QUERIES_QUERY_KEY } from './use_fetch_discovery_queries';
import { CODE_INTELLIGENCE_RUN_STATUS_QUERY_KEY } from './use_code_intelligence_run_status';
import { CODE_KNOWLEDGE_INDICATORS_QUERY_KEY } from './use_fetch_code_knowledge_indicators';
import { CODE_INTELLIGENCE_SERVICE_DISTRIBUTION_QUERY_KEY } from './use_code_intelligence_service_distribution';

/**
 * Triggers and manages code intelligence extraction from the Code Intelligence
 * tab. The server-side workflow processes all indexed repositories.
 */
export function useCodeIntelligenceRun({
  onRunStarted,
}: {
  onRunStarted?: (executionId: string) => void;
} = {}) {
  const {
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: {
        significantEvents: { significantEventsRepositoryClient },
      },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const { signal } = useAbortController();

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: CODE_KNOWLEDGE_INDICATORS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: CODE_INTELLIGENCE_SERVICE_DISTRIBUTION_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['features', 'all'] }),
    ]);

  const runAllMutation = useMutation({
    mutationFn: () =>
      significantEventsRepositoryClient.fetch('POST /internal/streams/code_intelligence/_run', {
        signal,
      }),
    onSuccess: (result) => {
      toasts.addSuccess({
        title: result.isNew ? RUN_ALL_STARTED_TITLE : RUN_ALL_IN_PROGRESS_TITLE,
        text: result.isNew
          ? i18n.translate('xpack.significantEventsApp.codeIntelligence.runAllStartedText', {
              defaultMessage:
                'Code Intelligence is identifying services across your indexed repositories. Features and queries refresh here when the run completes.',
            })
          : i18n.translate('xpack.significantEventsApp.codeIntelligence.runAllInProgressText', {
              defaultMessage: 'A code intelligence run is already in progress for this space.',
            }),
      });
      // Seed the new execution as active before refetching its server state so
      // a cached terminal result from the prior run cannot briefly re-enable
      // controls or stop polling.
      onRunStarted?.(result.executionId);
      queryClient.setQueryData([...CODE_INTELLIGENCE_RUN_STATUS_QUERY_KEY, result.executionId], {
        executionId: result.executionId,
        status: SignificantEventsWorkflowStatus.InProgress,
      });
      void queryClient.invalidateQueries({ queryKey: CODE_INTELLIGENCE_RUN_STATUS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), { title: RUN_FAILURE_TITLE });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      let cursor: string | undefined;
      const result = {
        streamsReconciled: 0,
        clustersMerged: 0,
        queriesTombstoned: 0,
        failedStreams: [] as string[],
      };
      do {
        const batch = await significantEventsRepositoryClient.fetch(
          'POST /internal/streams/code_intelligence/_reconcile',
          {
            params: { body: { cursor } },
            signal,
          }
        );
        result.streamsReconciled += batch.streamsReconciled;
        result.clustersMerged += batch.clustersMerged;
        result.queriesTombstoned += batch.queriesTombstoned;
        result.failedStreams.push(...batch.failedStreams);
        cursor = batch.nextCursor;
      } while (cursor);
      return result;
    },
    onSuccess: (result) => {
      const text = i18n.translate(
        'xpack.significantEventsApp.codeIntelligence.reconcileSuccessText',
        {
          defaultMessage:
            'Reconciled {streamsReconciled} stream{streamsReconciled, plural, one {} other {s}}: {clustersMerged} merged, {queriesTombstoned} removed.',
          values: {
            streamsReconciled: result.streamsReconciled,
            clustersMerged: result.clustersMerged,
            queriesTombstoned: result.queriesTombstoned,
          },
        }
      );
      if (result.failedStreams.length > 0) {
        toasts.addWarning({
          title: RECONCILE_PARTIAL_TITLE,
          text: `${text} ${RECONCILE_PARTIAL_TEXT(result.failedStreams)}`,
        });
      } else {
        toasts.addSuccess({ title: RECONCILE_SUCCESS_TITLE, text });
      }
      void invalidate();
    },
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), { title: RECONCILE_FAILURE_TITLE });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      let cursor: string | undefined;
      const result = { deleted: 0, streamsAffected: 0, failedStreams: [] as string[] };
      do {
        const batch = await significantEventsRepositoryClient.fetch(
          'POST /internal/streams/code_intelligence/_reset',
          {
            params: { body: { cursor } },
            signal,
          }
        );
        result.deleted += batch.deleted;
        result.streamsAffected += batch.streamsAffected;
        result.failedStreams.push(...batch.failedStreams);
        cursor = batch.nextCursor;
      } while (cursor);
      return result;
    },
    onSuccess: (result) => {
      const text = RESET_SUCCESS_TEXT({
        deleted: result.deleted,
        streamsAffected: result.streamsAffected,
      });
      if (result.failedStreams.length > 0) {
        toasts.addWarning({
          title: RESET_PARTIAL_TITLE,
          text: `${text} ${RESET_PARTIAL_TEXT(result.failedStreams)}`,
        });
      } else {
        toasts.addSuccess({ title: RESET_SUCCESS_TITLE, text });
      }
      void invalidate();
    },
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), { title: RESET_FAILURE_TITLE });
    },
  });

  return {
    runAll: () => runAllMutation.mutate(),
    isRunningAll: runAllMutation.isLoading,
    reset: () => resetMutation.mutate(),
    isResetting: resetMutation.isLoading,
    reconcile: () => reconcileMutation.mutate(),
    isReconciling: reconcileMutation.isLoading,
  };
}

const RUN_ALL_STARTED_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.runAllStartedTitle',
  { defaultMessage: 'Code intelligence run started' }
);

const RUN_ALL_IN_PROGRESS_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.runAllInProgressTitle',
  { defaultMessage: 'Code intelligence run already in progress' }
);

const RUN_FAILURE_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.runFailureTitle',
  { defaultMessage: 'Failed to run code intelligence' }
);

const RECONCILE_SUCCESS_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.reconcileSuccessTitle',
  { defaultMessage: 'Knowledge indicators reconciled' }
);

const RECONCILE_PARTIAL_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.reconcilePartialTitle',
  { defaultMessage: 'Knowledge indicators reconciled with failures' }
);

const RECONCILE_PARTIAL_TEXT = (failedStreams: string[]) =>
  i18n.translate('xpack.significantEventsApp.codeIntelligence.reconcilePartialText', {
    defaultMessage:
      '{failedStreams, plural, one {# stream could not be reconciled} other {# streams could not be reconciled}}: {streamNames}.',
    values: { failedStreams: failedStreams.length, streamNames: failedStreams.join(', ') },
  });

const RECONCILE_FAILURE_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.reconcileFailureTitle',
  { defaultMessage: 'Failed to reconcile knowledge indicators' }
);

const RESET_SUCCESS_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.resetSuccessTitle',
  { defaultMessage: 'Code features deleted' }
);

const RESET_PARTIAL_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.resetPartialTitle',
  { defaultMessage: 'Code features deleted with failures' }
);
const RESET_SUCCESS_TEXT = ({
  deleted,
  streamsAffected,
}: {
  deleted: number;
  streamsAffected: number;
}) =>
  i18n.translate('xpack.significantEventsApp.codeIntelligence.resetSuccessText', {
    defaultMessage:
      'Deleted {deleted} code knowledge indicator{deleted, plural, one {} other {s}} across {streamsAffected} stream{streamsAffected, plural, one {} other {s}}.',
    values: { deleted, streamsAffected },
  });
const RESET_PARTIAL_TEXT = (failedStreams: string[]) =>
  i18n.translate('xpack.significantEventsApp.codeIntelligence.resetPartialText', {
    defaultMessage:
      '{failedStreams, plural, one {# stream could not be reset} other {# streams could not be reset}}: {streamNames}.',
    values: { failedStreams: failedStreams.length, streamNames: failedStreams.join(', ') },
  });
const RESET_FAILURE_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.resetFailureTitle',
  { defaultMessage: 'Failed to delete code features' }
);
