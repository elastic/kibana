/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../use_kibana';
import { getFormattedError } from '../../util/errors';
import { DISCOVERY_QUERIES_QUERY_KEY } from './use_fetch_discovery_queries';
import { CODE_INTELLIGENCE_RUN_STATUS_QUERY_KEY } from './use_code_intelligence_run_status';
import { CODE_KNOWLEDGE_INDICATORS_QUERY_KEY } from './use_fetch_code_knowledge_indicators';
import { CODE_INTELLIGENCE_SERVICE_DISTRIBUTION_QUERY_KEY } from './use_code_intelligence_service_distribution';

/**
 * Triggers code intelligence identification from the discovery Code Intelligence
 * tab: `runAll` sweeps all eligible streams (mirrors the scheduled workflow),
 * `runForStream` re-runs a single stream. Both invalidate the repositories +
 * queries views on success.
 */
export function useCodeIntelligenceRun() {
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
  const { signal } = useAbortController();

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: CODE_KNOWLEDGE_INDICATORS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: CODE_INTELLIGENCE_SERVICE_DISTRIBUTION_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
    ]);

  const runAllMutation = useMutation({
    mutationFn: () =>
      streamsRepositoryClient.fetch('POST /internal/streams/code_intelligence/_run', { signal }),
    onSuccess: (result) => {
      toasts.addSuccess({
        title: result.isNew ? RUN_ALL_STARTED_TITLE : RUN_ALL_IN_PROGRESS_TITLE,
        text: result.isNew
          ? i18n.translate('xpack.streams.codeIntelligence.runAllStartedText', {
              defaultMessage:
                'The GitHub Code Researcher is identifying services and logging sites across configured repositories. Features and queries appear here as they finish.',
            })
          : i18n.translate('xpack.streams.codeIntelligence.runAllInProgressText', {
              defaultMessage: 'A code intelligence run is already in progress for this space.',
            }),
      });
      // Kick off status polling so the tab tracks the async run and refreshes
      // the derived views when it completes.
      void queryClient.invalidateQueries({ queryKey: CODE_INTELLIGENCE_RUN_STATUS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), { title: RUN_FAILURE_TITLE });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: () =>
      streamsRepositoryClient.fetch('POST /internal/streams/code_intelligence/_reconcile', {
        signal,
      }),
    onSuccess: (result) => {
      toasts.addSuccess({
        title: RECONCILE_SUCCESS_TITLE,
        text: i18n.translate('xpack.streams.codeIntelligence.reconcileSuccessText', {
          defaultMessage:
            'Reconciled {streamsReconciled} stream{streamsReconciled, plural, one {} other {s}}: {clustersMerged} merged, {queriesTombstoned} removed.',
          values: {
            streamsReconciled: result.streamsReconciled,
            clustersMerged: result.clustersMerged,
            queriesTombstoned: result.queriesTombstoned,
          },
        }),
      });
      void invalidate();
    },
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), { title: RECONCILE_FAILURE_TITLE });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      streamsRepositoryClient.fetch('POST /internal/streams/code_intelligence/_reset', { signal }),
    onSuccess: (result) => {
      toasts.addSuccess({
        title: RESET_SUCCESS_TITLE,
        text: i18n.translate('xpack.streams.codeIntelligence.resetSuccessText', {
          defaultMessage:
            'Deleted {deleted} code knowledge indicator{deleted, plural, one {} other {s}} across {streamsAffected} stream{streamsAffected, plural, one {} other {s}}.',
          values: {
            deleted: result.deleted,
            streamsAffected: result.streamsAffected,
          },
        }),
      });
      void invalidate();
    },
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), { title: RESET_FAILURE_TITLE });
    },
  });

  const runForStreamMutation = useMutation({
    mutationFn: async (_streamName: string) => {
      await streamsRepositoryClient.fetch('POST /internal/streams/code_intelligence/_run', {
        signal,
      });
    },
    onSuccess: () => {
      toasts.addSuccess({ title: RUN_STREAM_SUCCESS_TITLE });
      void invalidate();
    },
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), { title: RUN_FAILURE_TITLE });
    },
  });

  return {
    runAll: () => runAllMutation.mutate(),
    isRunningAll: runAllMutation.isLoading,
    runForStream: (streamName: string) => runForStreamMutation.mutate(streamName),
    runningStreamName: runForStreamMutation.isLoading ? runForStreamMutation.variables : undefined,
    reset: () => resetMutation.mutate(),
    isResetting: resetMutation.isLoading,
    reconcile: () => reconcileMutation.mutate(),
    isReconciling: reconcileMutation.isLoading,
  };
}

const RUN_ALL_STARTED_TITLE = i18n.translate('xpack.streams.codeIntelligence.runAllStartedTitle', {
  defaultMessage: 'Code intelligence run started',
});

const RUN_ALL_IN_PROGRESS_TITLE = i18n.translate(
  'xpack.streams.codeIntelligence.runAllInProgressTitle',
  { defaultMessage: 'Code intelligence run already in progress' }
);

const RUN_STREAM_SUCCESS_TITLE = i18n.translate(
  'xpack.streams.codeIntelligence.runStreamSuccessTitle',
  { defaultMessage: 'Code intelligence updated for stream' }
);

const RUN_FAILURE_TITLE = i18n.translate('xpack.streams.codeIntelligence.runFailureTitle', {
  defaultMessage: 'Failed to run code intelligence',
});

const RECONCILE_SUCCESS_TITLE = i18n.translate(
  'xpack.streams.codeIntelligence.reconcileSuccessTitle',
  { defaultMessage: 'Knowledge indicators reconciled' }
);

const RECONCILE_FAILURE_TITLE = i18n.translate(
  'xpack.streams.codeIntelligence.reconcileFailureTitle',
  { defaultMessage: 'Failed to reconcile knowledge indicators' }
);

const RESET_SUCCESS_TITLE = i18n.translate('xpack.streams.codeIntelligence.resetSuccessTitle', {
  defaultMessage: 'Code features deleted',
});

const RESET_FAILURE_TITLE = i18n.translate('xpack.streams.codeIntelligence.resetFailureTitle', {
  defaultMessage: 'Failed to delete code features',
});
