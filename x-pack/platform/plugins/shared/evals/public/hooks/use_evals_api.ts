/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EVALS_RUNS_URL,
  EVALS_RUN_URL,
  EVALS_RUN_SCORES_URL,
  EVALS_RUN_DATASET_EXAMPLES_URL,
  EVALS_RUNS_COMPARE_URL,
  EVALS_EXAMPLE_SCORES_URL,
  EVALS_TRACE_URL,
  EVALS_TRACING_PROJECTS_URL,
  EVALS_TRACING_PROJECT_TRACES_URL,
  EVALS_DATASETS_URL,
  EVALS_DATASET_URL,
  EVALS_DATASET_EXAMPLES_URL,
  EVALS_DATASET_EXAMPLE_URL,
  API_VERSIONS,
  type GetEvaluationDatasetsResponse,
  type GetEvaluationDatasetResponse,
  type CreateEvaluationDatasetRequestBodyInput,
  type CreateEvaluationDatasetResponse,
  type UpdateEvaluationDatasetRequestBodyInput,
  type UpdateEvaluationDatasetResponse,
  type DeleteEvaluationDatasetResponse,
  type AddEvaluationDatasetExamplesRequestBodyInput,
  type AddEvaluationDatasetExamplesResponse,
  type UpdateEvaluationDatasetExampleRequestBodyInput,
  type UpdateEvaluationDatasetExampleResponse,
  type DeleteEvaluationDatasetExampleResponse,
  type GetEvaluationRunsResponse,
  type GetEvaluationRunResponse,
  type GetEvaluationRunScoresResponse,
  type GetEvaluationRunDatasetExamplesResponse,
  type GetExampleScoresResponse,
  type GetTraceResponse,
  type GetTracingProjectsResponse,
  type GetProjectTracesResponse,
  type CompareRunsResponse,
} from '@kbn/evals-common';
import { queryKeys } from '../query_keys';

const EVALS_REMOTES_URL = '/internal/evals/remotes' as const;
const getRemoteUrl = (remoteId: string) =>
  `/internal/evals/remotes/${encodeURIComponent(remoteId)}` as const;

export interface EvalsRemoteSummary {
  id: string;
  displayName: string;
  url: string;
}

export interface GetEvalsRemotesResponse {
  remotes: EvalsRemoteSummary[];
}

interface RunsListFilters {
  suiteId?: string;
  modelId?: string;
  branch?: string;
  datasetId?: string;
  page?: number;
  perPage?: number;
}

interface DatasetsListFilters {
  page?: number;
  perPage?: number;
}

interface DatasetWithId {
  datasetId: string;
}

interface UpdateDatasetVariables extends DatasetWithId {
  updates: UpdateEvaluationDatasetRequestBodyInput;
}

interface AddExamplesVariables extends DatasetWithId {
  body: AddEvaluationDatasetExamplesRequestBodyInput;
}

interface ExampleWithDatasetId extends DatasetWithId {
  exampleId: string;
}

interface UpdateExampleVariables extends ExampleWithDatasetId {
  updates: UpdateEvaluationDatasetExampleRequestBodyInput;
}

const getDatasetUrl = (datasetId: string) =>
  EVALS_DATASET_URL.replace('{datasetId}', encodeURIComponent(datasetId));

const getDatasetExamplesUrl = (datasetId: string) =>
  EVALS_DATASET_EXAMPLES_URL.replace('{datasetId}', encodeURIComponent(datasetId));

const getDatasetExampleUrl = (datasetId: string, exampleId: string) =>
  EVALS_DATASET_EXAMPLE_URL.replace('{datasetId}', encodeURIComponent(datasetId)).replace(
    '{exampleId}',
    encodeURIComponent(exampleId)
  );

export const useDatasets = (filters: DatasetsListFilters = {}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.datasets.list(filters),
    queryFn: async (): Promise<GetEvaluationDatasetsResponse> => {
      const query: Record<string, number> = {};
      if (filters.page) query.page = filters.page;
      if (filters.perPage) query.per_page = filters.perPage;

      return services.http!.get<GetEvaluationDatasetsResponse>(EVALS_DATASETS_URL, {
        query,
        version: API_VERSIONS.internal.v1,
      });
    },
    keepPreviousData: true,
    retry: (_failureCount, error) => {
      if (isHttpFetchError(error)) {
        return !error.response?.status || error.response.status >= 500;
      }
      return true;
    },
  });
};

export const useDataset = (datasetId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.datasets.detail(datasetId),
    queryFn: async (): Promise<GetEvaluationDatasetResponse> => {
      return services.http!.get<GetEvaluationDatasetResponse>(getDatasetUrl(datasetId), {
        version: API_VERSIONS.internal.v1,
      });
    },
    retry: (_failureCount, error) => {
      if (isHttpFetchError(error)) {
        return !error.response?.status || error.response.status >= 500;
      }
      return true;
    },
    refetchOnWindowFocus: false,
  });
};

export const useCreateDataset = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: CreateEvaluationDatasetRequestBodyInput
    ): Promise<CreateEvaluationDatasetResponse> => {
      return services.http!.post<CreateEvaluationDatasetResponse>(EVALS_DATASETS_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.datasets.all });
    },
  });
};

export const useUpdateDataset = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      datasetId,
      updates,
    }: UpdateDatasetVariables): Promise<UpdateEvaluationDatasetResponse> => {
      return services.http!.put<UpdateEvaluationDatasetResponse>(getDatasetUrl(datasetId), {
        body: JSON.stringify(updates),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async (_response, { datasetId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.detail(datasetId) }),
      ]);
    },
  });
};

export const useDeleteDataset = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ datasetId }: DatasetWithId): Promise<DeleteEvaluationDatasetResponse> => {
      return services.http!.delete<DeleteEvaluationDatasetResponse>(getDatasetUrl(datasetId), {
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async (_response, { datasetId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.detail(datasetId) }),
      ]);
    },
  });
};

export const useAddExamples = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      datasetId,
      body,
    }: AddExamplesVariables): Promise<AddEvaluationDatasetExamplesResponse> => {
      return services.http!.post<AddEvaluationDatasetExamplesResponse>(
        getDatasetExamplesUrl(datasetId),
        {
          body: JSON.stringify(body),
          version: API_VERSIONS.internal.v1,
        }
      );
    },
    onSuccess: async (_response, { datasetId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.detail(datasetId) }),
      ]);
    },
  });
};

export const useUpdateExample = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      datasetId,
      exampleId,
      updates,
    }: UpdateExampleVariables): Promise<UpdateEvaluationDatasetExampleResponse> => {
      return services.http!.put<UpdateEvaluationDatasetExampleResponse>(
        getDatasetExampleUrl(datasetId, exampleId),
        {
          body: JSON.stringify(updates),
          version: API_VERSIONS.internal.v1,
        }
      );
    },
    onSuccess: async (_response, { datasetId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.detail(datasetId) }),
      ]);
    },
  });
};

export const useDeleteExample = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      datasetId,
      exampleId,
    }: ExampleWithDatasetId): Promise<DeleteEvaluationDatasetExampleResponse> => {
      return services.http!.delete<DeleteEvaluationDatasetExampleResponse>(
        getDatasetExampleUrl(datasetId, exampleId),
        {
          version: API_VERSIONS.internal.v1,
        }
      );
    },
    onSuccess: async (_response, { datasetId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.detail(datasetId) }),
      ]);
    },
  });
};

export const useRemotes = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.remotes.list(),
    queryFn: async (): Promise<GetEvalsRemotesResponse> => {
      return services.http!.get<GetEvalsRemotesResponse>(EVALS_REMOTES_URL, {
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

export const useCreateRemote = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { displayName: string; url: string; apiKey: string }) => {
      return services.http!.post<EvalsRemoteSummary>(EVALS_REMOTES_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.remotes.all });
    },
  });
};

export const useUpdateRemote = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      remoteId: string;
      updates: { displayName?: string; url?: string; apiKey?: string };
    }) => {
      return services.http!.put<EvalsRemoteSummary>(getRemoteUrl(args.remoteId), {
        body: JSON.stringify(args.updates),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.remotes.all });
    },
  });
};

export const useTestRemoteConnection = () => {
  const { services } = useKibana();

  return useMutation({
    mutationFn: async (body: {
      url?: string;
      apiKey?: string;
      remoteId?: string;
    }): Promise<{ success: boolean; statusCode: number; message?: string }> => {
      return services.http!.post('/internal/evals/remotes/_test', {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

export const useDeleteRemote = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (remoteId: string) => {
      return services.http!.delete<{ deleted: boolean }>(getRemoteUrl(remoteId), {
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.remotes.all });
    },
  });
};

export const useEvaluationRuns = (filters: RunsListFilters = {}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.runs.list(filters),
    queryFn: async (): Promise<GetEvaluationRunsResponse> => {
      const query: Record<string, string | number> = {};
      if (filters.suiteId) query.suite_id = filters.suiteId;
      if (filters.modelId) query.model_id = filters.modelId;
      if (filters.branch) query.branch = filters.branch;
      if (filters.datasetId) query.dataset_id = filters.datasetId;
      if (filters.page) query.page = filters.page;
      if (filters.perPage) query.per_page = filters.perPage;

      return services.http!.get<GetEvaluationRunsResponse>(EVALS_RUNS_URL, {
        query,
        version: API_VERSIONS.internal.v1,
      });
    },
    keepPreviousData: true,
    retry: (_failureCount, error) => {
      if (isHttpFetchError(error)) {
        return !error.response?.status || error.response.status >= 500;
      }
      return true;
    },
  });
};

export const useEvaluationRun = (runId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.runs.detail(runId),
    queryFn: async (): Promise<GetEvaluationRunResponse> => {
      const url = EVALS_RUN_URL.replace('{runId}', encodeURIComponent(runId));
      return services.http!.get<GetEvaluationRunResponse>(url, {
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: runId.length > 0,
    retry: (_failureCount, error) => {
      if (isHttpFetchError(error)) {
        return !error.response?.status || error.response.status >= 500;
      }
      return true;
    },
    refetchOnWindowFocus: false,
  });
};

export const useEvaluationRunScores = (runId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.runs.scores(runId),
    queryFn: async (): Promise<GetEvaluationRunScoresResponse> => {
      const url = EVALS_RUN_SCORES_URL.replace('{runId}', encodeURIComponent(runId));
      return services.http!.get<GetEvaluationRunScoresResponse>(url, {
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

export const useCompareRuns = (runIdA: string, runIdB: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.runs.compare(runIdA, runIdB),
    queryFn: async (): Promise<CompareRunsResponse> => {
      return services.http!.get<CompareRunsResponse>(EVALS_RUNS_COMPARE_URL, {
        query: { run_id_a: runIdA, run_id_b: runIdB },
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: runIdA.length > 0 && runIdB.length > 0,
    retry: (_failureCount, error) => {
      if (isHttpFetchError(error)) {
        return !error.response?.status || error.response.status >= 500;
      }
      return true;
    },
    refetchOnWindowFocus: false,
  });
};

export const useRunDatasetExamples = (runId: string, datasetId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.runs.datasetExamples(runId, datasetId),
    queryFn: async (): Promise<GetEvaluationRunDatasetExamplesResponse> => {
      const url = EVALS_RUN_DATASET_EXAMPLES_URL.replace(
        '{runId}',
        encodeURIComponent(runId)
      ).replace('{datasetId}', encodeURIComponent(datasetId));
      return services.http!.get<GetEvaluationRunDatasetExamplesResponse>(url, {
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: runId.length > 0 && datasetId.length > 0,
  });
};

export const useExampleScores = (exampleId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.examples.scores(exampleId),
    queryFn: async (): Promise<GetExampleScoresResponse> => {
      const url = EVALS_EXAMPLE_SCORES_URL.replace('{exampleId}', encodeURIComponent(exampleId));
      return services.http!.get<GetExampleScoresResponse>(url, {
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: exampleId.length > 0,
  });
};

export const useTrace = (traceId: string | null) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.traces.detail(traceId ?? ''),
    queryFn: async (): Promise<GetTraceResponse> => {
      if (!traceId) throw new Error('traceId is required');
      const url = EVALS_TRACE_URL.replace('{traceId}', encodeURIComponent(traceId));
      return services.http!.get<GetTraceResponse>(url, {
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: traceId != null,
  });
};

interface TracingProjectsFilters {
  from?: string;
  to?: string;
  name?: string;
  page?: number;
  perPage?: number;
}

interface TracingProjectsOptions {
  refetchInterval?: number | false;
}

export const useTracingProjects = (
  filters: TracingProjectsFilters = {},
  options: TracingProjectsOptions = {}
) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.tracing.projects(filters),
    queryFn: async (): Promise<GetTracingProjectsResponse> => {
      const query: Record<string, string | number> = {};
      if (filters.from) query.from = filters.from;
      if (filters.to) query.to = filters.to;
      if (filters.name) query.name = filters.name;
      if (filters.page) query.page = filters.page;
      if (filters.perPage) query.per_page = filters.perPage;

      return services.http!.get<GetTracingProjectsResponse>(EVALS_TRACING_PROJECTS_URL, {
        query,
        version: API_VERSIONS.internal.v1,
      });
    },
    keepPreviousData: true,
    refetchInterval: options.refetchInterval,
  });
};

interface ProjectTracesFilters {
  from?: string;
  to?: string;
  name?: string;
  sortField?: string;
  sortOrder?: string;
  page?: number;
  perPage?: number;
}

interface ProjectTracesOptions {
  refetchInterval?: number | false;
}

export const useProjectTraces = (
  projectName: string,
  filters: ProjectTracesFilters = {},
  options: ProjectTracesOptions = {}
) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.tracing.projectTraces(projectName, filters),
    queryFn: async (): Promise<GetProjectTracesResponse> => {
      const url = EVALS_TRACING_PROJECT_TRACES_URL.replace(
        '{projectName}',
        encodeURIComponent(projectName)
      );
      const query: Record<string, string | number> = {};
      if (filters.from) query.from = filters.from;
      if (filters.to) query.to = filters.to;
      if (filters.name) query.name = filters.name;
      if (filters.sortField) query.sort_field = filters.sortField;
      if (filters.sortOrder) query.sort_order = filters.sortOrder;
      if (filters.page) query.page = filters.page;
      if (filters.perPage) query.per_page = filters.perPage;

      return services.http!.get<GetProjectTracesResponse>(url, {
        query,
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: projectName.length > 0,
    keepPreviousData: true,
    refetchInterval: options.refetchInterval,
  });
};
