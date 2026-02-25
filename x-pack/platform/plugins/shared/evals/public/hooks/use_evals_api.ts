/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
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

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const useEvaluationRuns = (params?: {
  suiteId?: string;
  modelId?: string;
  branch?: string;
  page?: number;
  perPage?: number;
}) => {
  const { services } = useKibana();
  const [state, setState] = useState<UseApiState<GetEvaluationRunsResponse>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchRuns = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const query: Record<string, string | number> = {};
      if (params?.suiteId) query.suite_id = params.suiteId;
      if (params?.modelId) query.model_id = params.modelId;
      if (params?.branch) query.branch = params.branch;
      if (params?.page) query.page = params.page;
      if (params?.perPage) query.per_page = params.perPage;

      const data = await services.http!.get<GetEvaluationRunsResponse>(EVALS_RUNS_URL, {
        query,
        version: API_VERSIONS.internal.v1,
      });
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: String(error) });
    }
  }, [
    services.http,
    params?.suiteId,
    params?.modelId,
    params?.branch,
    params?.page,
    params?.perPage,
  ]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return { ...state, refetch: fetchRuns };
};

export const useEvaluationRun = (runId: string) => {
  const { services } = useKibana();
  const [state, setState] = useState<UseApiState<GetEvaluationRunResponse>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchRun = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const url = EVALS_RUN_URL.replace('{runId}', runId);
        const data = await services.http!.get<GetEvaluationRunResponse>(url, {
          version: API_VERSIONS.internal.v1,
        });
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: String(error) });
      }
    };
    fetchRun();
  }, [services.http, runId]);

  return state;
};

export const useEvaluationRunScores = (runId: string) => {
  const { services } = useKibana();
  const [state, setState] = useState<UseApiState<GetEvaluationRunScoresResponse>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchScores = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const url = EVALS_RUN_SCORES_URL.replace('{runId}', runId);
        const data = await services.http!.get<GetEvaluationRunScoresResponse>(url, {
          version: API_VERSIONS.internal.v1,
        });
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: String(error) });
      }
    };
    fetchScores();
  }, [services.http, runId]);

  return state;
};

export const useTrace = (traceId: string | null) => {
  const { services } = useKibana();
  const [state, setState] = useState<UseApiState<GetTraceResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!traceId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const fetchTrace = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const url = EVALS_TRACE_URL.replace('{traceId}', traceId);
        const data = await services.http!.get<GetTraceResponse>(url, {
          version: API_VERSIONS.internal.v1,
        });
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: String(error) });
      }
    };
    fetchTrace();
  }, [services.http, traceId]);

  return state;
};
