/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EVALS_RUNS_URL,
  EVALS_RUN_URL,
  EVALS_RUN_SCORES_URL,
  EVALS_TRACE_URL,
  API_VERSIONS,
  type GetEvaluationRunsResponse,
  type GetEvaluationRunResponse,
  type GetEvaluationRunScoresResponse,
  type GetTraceResponse,
} from '@kbn/evals-common';
import { queryKeys } from '../query_keys';

interface RunsListFilters {
  suiteId?: string;
  modelId?: string;
  branch?: string;
  page?: number;
  perPage?: number;
}

export const useEvaluationRuns = (filters: RunsListFilters = {}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.runs.list(filters),
    queryFn: async (): Promise<GetEvaluationRunsResponse> => {
      const query: Record<string, string | number> = {};
      if (filters.suiteId) query.suite_id = filters.suiteId;
      if (filters.modelId) query.model_id = filters.modelId;
      if (filters.branch) query.branch = filters.branch;
      if (filters.page) query.page = filters.page;
      if (filters.perPage) query.per_page = filters.perPage;

      return services.http!.get<GetEvaluationRunsResponse>(EVALS_RUNS_URL, {
        query,
        version: API_VERSIONS.internal.v1,
      });
    },
    keepPreviousData: true,
  });
};

export const useEvaluationRun = (runId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.runs.detail(runId),
    queryFn: async (): Promise<GetEvaluationRunResponse> => {
      const url = EVALS_RUN_URL.replace('{runId}', runId);
      return services.http!.get<GetEvaluationRunResponse>(url, {
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

export const useEvaluationRunScores = (runId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.runs.scores(runId),
    queryFn: async (): Promise<GetEvaluationRunScoresResponse> => {
      const url = EVALS_RUN_SCORES_URL.replace('{runId}', runId);
      return services.http!.get<GetEvaluationRunScoresResponse>(url, {
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

export const useTrace = (traceId: string | null) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.traces.detail(traceId ?? ''),
    queryFn: async (): Promise<GetTraceResponse> => {
      const url = EVALS_TRACE_URL.replace('{traceId}', traceId!);
      return services.http!.get<GetTraceResponse>(url, {
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: traceId != null,
  });
};
