/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, EVALS_INTERNAL_URL } from '@kbn/evals-common';
import { queryKeys } from '../query_keys';

const EVALS_EVALUATORS_URL = `${EVALS_INTERNAL_URL}/evaluators` as const;
const EVALS_EVALUATOR_URL = `${EVALS_EVALUATORS_URL}/{evaluatorId}` as const;
const EVALS_EVALUATOR_TEST_URL = `${EVALS_EVALUATORS_URL}/test` as const;
const EVALS_EVALUATORS_CUSTOM_URL = `${EVALS_EVALUATORS_URL}/custom` as const;

export interface EvaluatorSummary {
  id: string;
  name: string;
  kind: 'LLM' | 'CODE';
  type: 'llm-judge' | 'code' | 'esql' | 'prebuilt';
  description: string;
  source: 'prebuilt' | 'custom';
  usage_count: number;
  version: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface EvaluatorDetail extends EvaluatorSummary {
  config: LlmJudgeConfig | CodeConfig | EsqlConfig | null;
  versions: EvaluatorVersion[];
  shared?: boolean;
}

export interface LlmJudgeConfig {
  type: 'llm-judge';
  prompt_template: string;
  scoring_mode: 'boolean' | 'continuous' | 'rubric';
  connector_id?: string;
  model_id?: string;
  feedback_key: string;
}

export interface CodeConfig {
  type: 'code';
  function_body: string;
}

export interface EsqlConfig {
  type: 'esql';
  query_template: string;
  score_expression: string;
  pass_condition: string;
}

export interface EvaluatorVersion {
  version: number;
  created_at: string;
  changelog?: string;
}

export interface CreateEvaluatorRequest {
  name: string;
  description: string;
  kind: 'LLM' | 'CODE';
  type: 'llm-judge' | 'code' | 'esql';
  config: LlmJudgeConfig | CodeConfig | EsqlConfig;
}

export interface UpdateEvaluatorRequest {
  name?: string;
  description?: string;
  config?: LlmJudgeConfig | CodeConfig | EsqlConfig;
  tags?: string[];
  shared?: boolean;
}

export interface TestEvaluatorRequest {
  evaluator_name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  expected?: unknown;
  metadata?: Record<string, unknown>;
}

export interface TestEvaluatorResult {
  evaluator: string;
  kind: 'LLM' | 'CODE';
  score: number | null;
  label?: string;
  explanation?: string;
  metadata?: Record<string, unknown>;
  traceId?: string;
}

export interface TestEvaluatorResponse {
  result: TestEvaluatorResult;
  duration_ms: number;
}

export interface ListEvaluatorsResponse {
  evaluators: EvaluatorSummary[];
  total: number;
}

interface EvaluatorsListFilters {
  page?: number;
  perPage?: number;
  search?: string;
}

const getEvaluatorUrl = (evaluatorId: string) =>
  EVALS_EVALUATOR_URL.replace('{evaluatorId}', evaluatorId);

export const useListEvaluators = (filters: EvaluatorsListFilters = {}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.evaluators.list(filters),
    queryFn: async (): Promise<ListEvaluatorsResponse> => {
      const query: Record<string, string | number> = {};
      if (filters.page) query.page = filters.page;
      if (filters.perPage) query.per_page = filters.perPage;
      if (filters.search) query.search = filters.search;

      return services.http!.get<ListEvaluatorsResponse>(EVALS_EVALUATORS_URL, {
        query,
        version: API_VERSIONS.internal.v1,
      });
    },
    keepPreviousData: true,
  });
};

export const useEvaluatorDetail = (evaluatorId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.evaluators.detail(evaluatorId),
    queryFn: async (): Promise<EvaluatorDetail> => {
      return services.http!.get<EvaluatorDetail>(getEvaluatorUrl(evaluatorId), {
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: evaluatorId.length > 0,
  });
};

export const useCreateEvaluator = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateEvaluatorRequest): Promise<EvaluatorDetail> => {
      return services.http!.post<EvaluatorDetail>(EVALS_EVALUATORS_CUSTOM_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.evaluators.all });
    },
  });
};

export const useUpdateEvaluator = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evaluatorId,
      updates,
    }: {
      evaluatorId: string;
      updates: UpdateEvaluatorRequest;
    }): Promise<EvaluatorDetail> => {
      return services.http!.put<EvaluatorDetail>(getEvaluatorUrl(evaluatorId), {
        body: JSON.stringify(updates),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async (_response, { evaluatorId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.evaluators.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.evaluators.detail(evaluatorId) }),
      ]);
    },
  });
};

export const useDeleteEvaluator = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evaluatorId }: { evaluatorId: string }): Promise<void> => {
      return services.http!.delete(getEvaluatorUrl(evaluatorId), {
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async (_response, { evaluatorId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.evaluators.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.evaluators.detail(evaluatorId) }),
      ]);
    },
  });
};

export const useTestEvaluator = () => {
  const { services } = useKibana();

  return useMutation({
    mutationFn: async (body: TestEvaluatorRequest): Promise<TestEvaluatorResponse> => {
      return services.http!.post<TestEvaluatorResponse>(EVALS_EVALUATOR_TEST_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};
