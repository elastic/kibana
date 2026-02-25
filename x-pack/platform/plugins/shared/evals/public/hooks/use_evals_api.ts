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
} from '@kbn/evals-common';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface RunSummary {
  run_id: string;
  timestamp: string;
  suite_id?: string;
  task_model: { id: string; family?: string; provider?: string };
  evaluator_model: { id: string; family?: string; provider?: string };
  git_branch: string | null;
  git_commit_sha: string | null;
  total_scores: number;
  total_repetitions: number;
  ci?: { build_url?: string };
}

export interface EvaluatorStatsSummary {
  dataset_id: string;
  dataset_name: string;
  evaluator_name: string;
  stats: {
    mean: number;
    median: number;
    std_dev: number;
    min: number;
    max: number;
    count: number;
  };
}

export interface RunDetail {
  run_id: string;
  task_model?: { id: string; family?: string; provider?: string };
  evaluator_model?: { id: string; family?: string; provider?: string };
  total_repetitions?: number;
  stats: EvaluatorStatsSummary[];
}

export interface TraceSpan {
  span_id: string;
  trace_id: string;
  parent_span_id?: string;
  name: string;
  kind?: string;
  status?: string;
  start_time: string;
  duration_ms: number;
  attributes: Record<string, unknown>;
}

export interface TraceData {
  trace_id: string;
  spans: TraceSpan[];
  total_spans: number;
  duration_ms: number;
}

export const useEvaluationRuns = (params?: {
  suiteId?: string;
  modelId?: string;
  branch?: string;
  page?: number;
  perPage?: number;
}) => {
  const { services } = useKibana();
  const [state, setState] = useState<UseApiState<{ runs: RunSummary[]; total: number }>>({
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

      const data = await services.http!.get<{ runs: RunSummary[]; total: number }>(EVALS_RUNS_URL, {
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
  const [state, setState] = useState<UseApiState<RunDetail>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchRun = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const url = EVALS_RUN_URL.replace('{runId}', runId);
        const data = await services.http!.get<RunDetail>(url, {
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
  const [state, setState] = useState<UseApiState<{ scores: any[]; total: number }>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchScores = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const url = EVALS_RUN_SCORES_URL.replace('{runId}', runId);
        const data = await services.http!.get<{ scores: any[]; total: number }>(url, {
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
  const [state, setState] = useState<UseApiState<TraceData>>({
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
        const data = await services.http!.get<TraceData>(url, {
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
