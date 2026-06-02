/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import { API_VERSIONS } from '@kbn/evals-common';
import { queryKeys } from '../query_keys';

const isTerminalStatus = (status: WorkflowExecutionDto['status'] | undefined): boolean =>
  Boolean(status && TerminalExecutionStatuses.includes(status));

const EVALS_EXPERIMENTS_SUITES_URL = '/internal/evals/experiments/suites';
const EVALS_EXPERIMENTS_RUN_NOW_URL = '/internal/evals/experiments/runs/run_now';
const EVALS_EXPERIMENTS_RUN_URL = '/internal/evals/experiments/runs/{workflowExecutionId}';
const EVALS_EXPERIMENTS_RUN_LOGS_URL =
  '/internal/evals/experiments/runs/{workflowExecutionId}/logs';
const EVALS_EXPERIMENTS_RUN_CANCEL_URL =
  '/internal/evals/experiments/runs/{workflowExecutionId}/cancel';

const getExperimentRunUrl = (workflowExecutionId: string) =>
  EVALS_EXPERIMENTS_RUN_URL.replace('{workflowExecutionId}', workflowExecutionId);

const getExperimentRunLogsUrl = (workflowExecutionId: string) =>
  EVALS_EXPERIMENTS_RUN_LOGS_URL.replace('{workflowExecutionId}', workflowExecutionId);

const getExperimentRunCancelUrl = (workflowExecutionId: string) =>
  EVALS_EXPERIMENTS_RUN_CANCEL_URL.replace('{workflowExecutionId}', workflowExecutionId);

export interface ExperimentSuiteListItem {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  /**
   * Suite-level default for the "Run now" repetitions field. The UI seeds the
   * input with this value when the user opens the modal so the form reflects
   * the suite's own opinion rather than a generic UI default. Falls back to
   * {@link DEFAULT_RUN_NOW_REPETITIONS} when absent.
   */
  default_repetitions?: number;
}

export interface GetExperimentSuitesResponse {
  suites: ExperimentSuiteListItem[];
  /**
   * `false` when the Workflows plugins required for dispatching/observing
   * runs are not present. The UI uses this to render an `EuiEmptyPrompt`
   * instead of a table that would 503 on every interaction.
   */
  available: boolean;
  unavailable_reason?: string;
  missing_plugins?: string[];
}

/**
 * UI-side fallback when neither the suite nor the form input specifies a
 * value. Mirrors the server constant in `server/experiments/types.ts`.
 */
export const DEFAULT_RUN_NOW_REPETITIONS = 3;

export interface RunExperimentSuiteNowRequestBody {
  suite_id: string;
  task_connector_id: string;
  judge_connector_id: string;
  suite_params?: Record<string, unknown>;
  repetitions?: number;
}

export interface RunExperimentSuiteNowResponse {
  run_id: string;
  suite_id: string;
  workflow_execution_id: string;
}

export interface GetExperimentRunResponse {
  execution: WorkflowExecutionDto;
}

export interface ExperimentRunLogEntry {
  id: string;
  timestamp: string;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  message: string;
  stepId?: string;
  stepName?: string;
  connectorType?: string;
  duration?: number;
  additionalData?: Record<string, unknown>;
}

export interface GetExperimentRunLogsResponse {
  logs: ExperimentRunLogEntry[];
  total: number;
  size: number;
  page: number;
}

export const useExperimentSuites = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.experiments.suites(),
    queryFn: async (): Promise<GetExperimentSuitesResponse> => {
      return services.http!.get<GetExperimentSuitesResponse>(EVALS_EXPERIMENTS_SUITES_URL, {
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

export const useRunExperimentSuiteNow = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: RunExperimentSuiteNowRequestBody
    ): Promise<RunExperimentSuiteNowResponse> => {
      return services.http!.post<RunExperimentSuiteNowResponse>(EVALS_EXPERIMENTS_RUN_NOW_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.experiments.all });
    },
  });
};

export const useCancelExperimentRun = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowExecutionId,
    }: {
      workflowExecutionId: string;
    }): Promise<{ workflow_execution_id: string }> => {
      return services.http!.post<{ workflow_execution_id: string }>(
        getExperimentRunCancelUrl(workflowExecutionId),
        {
          body: JSON.stringify({}),
          version: API_VERSIONS.internal.v1,
        }
      );
    },
    onSuccess: async (_response, { workflowExecutionId }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.experiments.run(workflowExecutionId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.experiments.logs(workflowExecutionId),
        }),
      ]);
    },
  });
};

export const useExperimentRun = (
  workflowExecutionId: string | undefined,
  options?: { pollMs?: number }
) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: workflowExecutionId
      ? queryKeys.experiments.run(workflowExecutionId)
      : queryKeys.experiments.all,
    enabled: Boolean(workflowExecutionId),
    queryFn: async (): Promise<GetExperimentRunResponse> => {
      if (!workflowExecutionId) {
        throw new Error('workflowExecutionId is required');
      }

      return services.http!.get<GetExperimentRunResponse>(
        getExperimentRunUrl(workflowExecutionId),
        {
          version: API_VERSIONS.internal.v1,
        }
      );
    },
    // Stop polling once the workflow execution reaches a terminal status
    // (completed/failed/cancelled/timed_out/skipped). Otherwise the UI keeps
    // hammering the server forever after a run is done.
    refetchInterval: (data) =>
      options?.pollMs && !isTerminalStatus(data?.execution?.status) ? options.pollMs : false,
  });
};

export const useExperimentRunLogs = (
  workflowExecutionId: string | undefined,
  options?: { page?: number; size?: number; pollMs?: number; stopPolling?: boolean }
) => {
  const { services } = useKibana();
  const page = options?.page ?? 1;
  const size = options?.size ?? 50;

  return useQuery({
    queryKey: workflowExecutionId
      ? queryKeys.experiments.logs(workflowExecutionId, { page, size })
      : queryKeys.experiments.all,
    enabled: Boolean(workflowExecutionId),
    queryFn: async (): Promise<GetExperimentRunLogsResponse> => {
      if (!workflowExecutionId) {
        throw new Error('workflowExecutionId is required');
      }

      return services.http!.get<GetExperimentRunLogsResponse>(
        getExperimentRunLogsUrl(workflowExecutionId),
        {
          query: { page, size, sort_order: 'desc' },
          version: API_VERSIONS.internal.v1,
        }
      );
    },
    // Logs don't know the execution status, so the caller must signal when the
    // run reaches a terminal state via `stopPolling` to stop the refetch loop.
    refetchInterval: options?.pollMs && !options?.stopPolling ? options.pollMs : false,
    keepPreviousData: true,
  });
};
