/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import {
  SignificantEventsWorkflowStatus,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';
import { DISCOVERY_QUERIES_QUERY_KEY } from './use_fetch_discovery_queries';
import { CODE_KNOWLEDGE_INDICATORS_QUERY_KEY } from './use_fetch_code_knowledge_indicators';
import { CODE_INTELLIGENCE_SERVICE_DISTRIBUTION_QUERY_KEY } from './use_code_intelligence_service_distribution';

export const CODE_INTELLIGENCE_RUN_STATUS_QUERY_KEY = ['code-intelligence-run-status'];

/**
 * Polls the code intelligence extraction workflow status while a run is in
 * progress. When a run transitions to a terminal state, it refreshes the
 * derived repositories + queries views and surfaces a completion/failure toast.
 * The workflow is long-running (LLM agent + per-service fan-out), so the tab
 * relies on this rather than a one-shot refetch after triggering.
 */
export function useCodeIntelligenceRunStatus({
  enabled = true,
  executionId,
}: {
  enabled?: boolean;
  /** Status is pinned to this run once the user starts one. */
  executionId?: string;
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
  const previousResult = useRef<
    { executionId: string | null; status: SignificantEventsWorkflowStatus } | undefined
  >(undefined);
  const { data, error, isError, refetch } = useQuery<SignificantEventsWorkflowStatusResult, Error>({
    queryKey: [...CODE_INTELLIGENCE_RUN_STATUS_QUERY_KEY, executionId ?? 'latest'],
    queryFn: async ({ signal }: QueryFunctionContext) =>
      significantEventsRepositoryClient.fetch(
        'GET /internal/streams/code_intelligence/_run_status',
        {
          params: { query: { executionId } },
          signal: signal ?? null,
        }
      ),
    // Poll while a run is in progress; stop once it reaches a terminal state.
    refetchInterval: (result) =>
      result?.status === SignificantEventsWorkflowStatus.InProgress ? 5_000 : false,
    enabled,
  });

  const status = data?.status;

  useEffect(() => {
    if (!status || !data) {
      return;
    }
    // The server returns an exact execution when requested. Retain this guard
    // so a stale or malformed response cannot finish a different run in the UI.
    if (executionId && data.executionId !== executionId) {
      return;
    }

    const previous = previousResult.current;
    const wasRunning =
      previous?.executionId === data.executionId &&
      previous?.status === SignificantEventsWorkflowStatus.InProgress;
    previousResult.current = { executionId: data.executionId ?? null, status };

    if (!wasRunning || status === SignificantEventsWorkflowStatus.InProgress) {
      return;
    }

    // A run just finished — refresh both specialised and shared KI views.
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: CODE_KNOWLEDGE_INDICATORS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: CODE_INTELLIGENCE_SERVICE_DISTRIBUTION_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['features', 'all'] }),
    ]);

    if (status === SignificantEventsWorkflowStatus.Completed) {
      toasts.addSuccess({ title: RUN_COMPLETE_TITLE });
    } else if (status === SignificantEventsWorkflowStatus.Failed) {
      const errorMessage = 'error' in data ? data.error : undefined;
      toasts.addError(new Error(errorMessage ?? UNKNOWN_ERROR), { title: RUN_FAILED_TITLE });
    } else if (status === SignificantEventsWorkflowStatus.Canceled) {
      toasts.addWarning({ title: RUN_CANCELED_TITLE });
    }
  }, [data, executionId, queryClient, status, toasts]);

  return {
    status,
    isRunning: !isError && status === SignificantEventsWorkflowStatus.InProgress,
    error,
    isError,
    refetch,
  };
}

const RUN_COMPLETE_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.runStatusCompleteTitle',
  {
    defaultMessage: 'Code intelligence run complete',
  }
);
const RUN_FAILED_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.runStatusFailedTitle',
  {
    defaultMessage: 'Code intelligence run failed',
  }
);
const RUN_CANCELED_TITLE = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.runStatusCanceledTitle',
  { defaultMessage: 'Code intelligence run canceled' }
);
const UNKNOWN_ERROR = i18n.translate(
  'xpack.significantEventsApp.codeIntelligence.runStatusUnknownError',
  {
    defaultMessage: 'The workflow run failed for an unknown reason.',
  }
);
