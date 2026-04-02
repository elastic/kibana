/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, EVALS_INTERNAL_URL } from '@kbn/evals-common';
import { queryKeys } from '../query_keys';

const EVALS_EVALUATE_URL = `${EVALS_INTERNAL_URL}/evaluate` as const;
const EVALS_PAIRWISE_URL = `${EVALS_INTERNAL_URL}/experiments/pairwise` as const;
const EVALS_GATES_URL = `${EVALS_INTERNAL_URL}/config/deployment-gates` as const;

export interface RunEvaluationRequest {
  run_id: string;
  evaluator_ids: string[];
}

export interface RunEvaluationResponse {
  status: string;
  scores: Array<{
    evaluator_id: string;
    score: number;
    label?: string;
    explanation?: string;
  }>;
}

export interface PairwiseExperimentRequest {
  skill_a_id?: string;
  skill_b_id?: string;
  skill_a?: { name: string; description: string; markdown: string };
  skill_b?: { name: string; description: string; markdown: string };
  dataset_id: string;
  evaluators: string[];
  connector_id: string;
  repetitions?: number;
}

export interface PairwiseExperimentResponse {
  skill_a_id: string;
  skill_b_id: string;
  per_evaluator: Array<{
    evaluator: string;
    score_a: number;
    score_b: number;
    delta: number;
    direction: 'A_better' | 'B_better' | 'tie';
  }>;
  aggregate_winner: 'A' | 'B' | 'tie';
  significance: {
    significant: boolean;
    p_value?: number;
    confidence_interval?: { lower: number; upper: number; mean: number; level: number };
    recommendation: string;
  };
  details: {
    total_examples: number;
    total_evaluators: number;
    repetitions: number;
    duration_ms: number;
  };
  timestamp: string;
}

export interface DeploymentGatesResponse {
  composite_threshold: number;
  per_evaluator: Record<string, { min: number }>;
  required_pass: string[];
  min_repetitions: number;
  created_at: string;
}

export const useRunEvaluation = () => {
  const { services } = useKibana();

  return useMutation({
    mutationFn: async (body: RunEvaluationRequest): Promise<RunEvaluationResponse> => {
      return services.http!.post<RunEvaluationResponse>(EVALS_EVALUATE_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

export const useRunPairwiseExperiment = () => {
  const { services } = useKibana();

  return useMutation({
    mutationFn: async (body: PairwiseExperimentRequest): Promise<PairwiseExperimentResponse> => {
      return services.http!.post<PairwiseExperimentResponse>(EVALS_PAIRWISE_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

export const useDeploymentGates = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.evaluation.gates(),
    queryFn: async (): Promise<DeploymentGatesResponse> => {
      return services.http!.get<DeploymentGatesResponse>(EVALS_GATES_URL, {
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};
