/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { API_VERSIONS } from '@kbn/evals-common';
import { queryKeys } from '../query_keys';

const EVALS_ONLINE_SUITES_URL = '/internal/evals/online/suites';
const EVALS_ONLINE_RUN_NOW_URL = '/internal/evals/online/runs/run_now';
const EVALS_ONLINE_RUN_URL = '/internal/evals/online/runs/{workflowExecutionId}';
const EVALS_ONLINE_RUN_LOGS_URL = '/internal/evals/online/runs/{workflowExecutionId}/logs';
const EVALS_ONLINE_RUN_CANCEL_URL = '/internal/evals/online/runs/{workflowExecutionId}/cancel';

const getOnlineRunUrl = (workflowExecutionId: string) =>
  EVALS_ONLINE_RUN_URL.replace('{workflowExecutionId}', workflowExecutionId);

const getOnlineRunLogsUrl = (workflowExecutionId: string) =>
  EVALS_ONLINE_RUN_LOGS_URL.replace('{workflowExecutionId}', workflowExecutionId);

const getOnlineRunCancelUrl = (workflowExecutionId: string) =>
  EVALS_ONLINE_RUN_CANCEL_URL.replace('{workflowExecutionId}', workflowExecutionId);

export interface OnlineSuiteListItem {
  id: string;
  name: string;
  description?: string;
}

export interface GetOnlineSuitesResponse {
  suites: OnlineSuiteListItem[];
}

export interface RunOnlineSuiteNowRequestBody {
  suite_id: string;
  task_connector_id: string;
  judge_connector_id: string;
  suite_params?: Record<string, unknown>;
  repetitions?: number;
}

export interface RunOnlineSuiteNowResponse {
  run_id: string;
  suite_id: string;
  workflow_execution_id: string;
}

export interface GetOnlineRunResponse {
  execution: WorkflowExecutionDto;
}

export interface OnlineRunLogEntry {
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

export interface GetOnlineRunLogsResponse {
  logs: OnlineRunLogEntry[];
  total: number;
  size: number;
  page: number;
}

export const useOnlineSuites = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.online.suites(),
    queryFn: async (): Promise<GetOnlineSuitesResponse> => {
      return services.http!.get<GetOnlineSuitesResponse>(EVALS_ONLINE_SUITES_URL, {
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

export const useRunOnlineSuiteNow = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: RunOnlineSuiteNowRequestBody): Promise<RunOnlineSuiteNowResponse> => {
      return services.http!.post<RunOnlineSuiteNowResponse>(EVALS_ONLINE_RUN_NOW_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.online.all });
    },
  });
};

export const useCancelOnlineRun = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowExecutionId,
    }: {
      workflowExecutionId: string;
    }): Promise<{ workflow_execution_id: string }> => {
      return services.http!.post<{ workflow_execution_id: string }>(
        getOnlineRunCancelUrl(workflowExecutionId),
        {
          body: JSON.stringify({}),
          version: API_VERSIONS.internal.v1,
        }
      );
    },
    onSuccess: async (_response, { workflowExecutionId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.online.run(workflowExecutionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.online.logs(workflowExecutionId) }),
      ]);
    },
  });
};

export const useOnlineRun = (
  workflowExecutionId: string | undefined,
  options?: { pollMs?: number }
) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: workflowExecutionId
      ? queryKeys.online.run(workflowExecutionId)
      : queryKeys.online.all,
    enabled: Boolean(workflowExecutionId),
    queryFn: async (): Promise<GetOnlineRunResponse> => {
      if (!workflowExecutionId) {
        throw new Error('workflowExecutionId is required');
      }

      return services.http!.get<GetOnlineRunResponse>(getOnlineRunUrl(workflowExecutionId), {
        version: API_VERSIONS.internal.v1,
      });
    },
    refetchInterval: options?.pollMs,
  });
};

export const useOnlineRunLogs = (
  workflowExecutionId: string | undefined,
  options?: { page?: number; size?: number; pollMs?: number }
) => {
  const { services } = useKibana();
  const page = options?.page ?? 1;
  const size = options?.size ?? 50;

  return useQuery({
    queryKey: workflowExecutionId
      ? queryKeys.online.logs(workflowExecutionId, { page, size })
      : queryKeys.online.all,
    enabled: Boolean(workflowExecutionId),
    queryFn: async (): Promise<GetOnlineRunLogsResponse> => {
      if (!workflowExecutionId) {
        throw new Error('workflowExecutionId is required');
      }

      return services.http!.get<GetOnlineRunLogsResponse>(
        getOnlineRunLogsUrl(workflowExecutionId),
        {
          query: { page, size, sort_order: 'desc' },
          version: API_VERSIONS.internal.v1,
        }
      );
    },
    refetchInterval: options?.pollMs,
    keepPreviousData: true,
  });
};
