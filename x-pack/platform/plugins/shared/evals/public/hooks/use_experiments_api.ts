/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueries, useQuery } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  EVALS_EVALUATORS_URL,
  EVALS_EXPERIMENTS_RUN_URL,
  EVALS_EXPERIMENTS_SAVE_WORKFLOW_URL,
  EVALS_EXPERIMENTS_PREVIEW_URL,
  EVALS_EXPERIMENT_TEMPLATES_URL,
  EVALS_EXPERIMENT_EXECUTION_URL,
  EVALS_EXPERIMENT_EXECUTION_CANCEL_URL,
  type ListEvaluatorsResponse,
} from '@kbn/evals-common';
import type {
  RunExperimentRequest,
  RunExperimentResponse,
  SaveAsWorkflowResponse,
  PreviewExperimentResponse,
  GetExperimentTemplatesResponse,
  ExperimentExecutionStatus,
} from '../../common/experiments/run_experiment';

/** A generative-AI/model action connector, as returned by the actions API. */
export interface ModelConnector {
  id: string;
  name: string;
  connectorTypeId: string;
  isDeprecated: boolean;
  isMissingSecrets: boolean;
}

interface RawActionConnector {
  id: string;
  name: string;
  connector_type_id: string;
  is_deprecated?: boolean;
  is_missing_secrets?: boolean;
}

/** Action connector types that represent a model that can be evaluated. */
export const MODEL_CONNECTOR_TYPE_IDS = ['.inference', '.gen-ai', '.bedrock', '.gemini'] as const;

const retryOnServerError = (_failureCount: number, error: unknown) => {
  if (isHttpFetchError(error)) {
    return !error.response?.status || error.response.status >= 500;
  }
  return true;
};

export const useExperimentTemplates = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: ['evals', 'experiment-templates'],
    queryFn: async (): Promise<GetExperimentTemplatesResponse> =>
      services.http!.get<GetExperimentTemplatesResponse>(EVALS_EXPERIMENT_TEMPLATES_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    retry: retryOnServerError,
    refetchOnWindowFocus: false,
  });
};

export const useEvaluators = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: ['evals', 'evaluators'],
    queryFn: async (): Promise<ListEvaluatorsResponse> =>
      services.http!.get<ListEvaluatorsResponse>(EVALS_EVALUATORS_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    retry: retryOnServerError,
    refetchOnWindowFocus: false,
  });
};

export const useModelConnectors = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: ['evals', 'model-connectors'],
    queryFn: async (): Promise<ModelConnector[]> => {
      const connectors = await services.http!.get<RawActionConnector[]>('/api/actions/connectors');
      const modelConnectors = connectors
        .filter((connector) => !connector.is_deprecated)
        .map<ModelConnector>((connector) => ({
          id: connector.id,
          name: connector.name,
          connectorTypeId: connector.connector_type_id,
          isDeprecated: connector.is_deprecated ?? false,
          isMissingSecrets: connector.is_missing_secrets ?? false,
        }));

      const modelTypeIds = new Set<string>(MODEL_CONNECTOR_TYPE_IDS);
      const filtered = modelConnectors.filter((connector) =>
        modelTypeIds.has(connector.connectorTypeId)
      );
      // Fall back to showing all connectors if none match the known model types,
      // so unusual deployments can still pick a connector.
      return filtered.length > 0 ? filtered : modelConnectors;
    },
    retry: retryOnServerError,
    refetchOnWindowFocus: false,
  });
};

/** A minimal view of an Agent Builder agent, used to populate the task-target picker. */
export interface AgentBuilderAgent {
  id: string;
  name?: string;
  description?: string;
}

interface ListAgentBuilderAgentsResponse {
  results: AgentBuilderAgent[];
}

/** Public Agent Builder HTTP API for listing agents. */
const AGENT_BUILDER_AGENTS_URL = '/api/agent_builder/agents';
const AGENT_BUILDER_PUBLIC_API_VERSION = '2023-10-31';

/**
 * Lists Agent Builder agents (including built-in ones) so the experiment form can
 * suggest them. Agent Builder may be disabled in some deployments, so callers should
 * treat an error or empty result as "no suggestions" and still allow free-form ids.
 */
export const useAgentBuilderAgents = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: ['evals', 'agent-builder-agents'],
    enabled,
    queryFn: async (): Promise<AgentBuilderAgent[]> => {
      const response = await services.http!.get<ListAgentBuilderAgentsResponse>(
        AGENT_BUILDER_AGENTS_URL,
        { version: AGENT_BUILDER_PUBLIC_API_VERSION }
      );
      return response.results ?? [];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useRunExperiment = () => {
  const { services } = useKibana();

  return useMutation({
    mutationFn: async (body: RunExperimentRequest): Promise<RunExperimentResponse> =>
      services.http!.post<RunExperimentResponse>(EVALS_EXPERIMENTS_RUN_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      }),
  });
};

export const useSaveExperimentWorkflow = () => {
  const { services } = useKibana();

  return useMutation({
    mutationFn: async (body: RunExperimentRequest): Promise<SaveAsWorkflowResponse> =>
      services.http!.post<SaveAsWorkflowResponse>(EVALS_EXPERIMENTS_SAVE_WORKFLOW_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      }),
  });
};

export const usePreviewExperiment = () => {
  const { services } = useKibana();

  return useMutation({
    mutationFn: async (body: RunExperimentRequest): Promise<PreviewExperimentResponse> =>
      services.http!.post<PreviewExperimentResponse>(EVALS_EXPERIMENTS_PREVIEW_URL, {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      }),
  });
};

export const useCancelWorkflowExecution = () => {
  const { services } = useKibana();

  return useMutation({
    mutationFn: async (workflowExecutionId: string): Promise<{ cancelled: boolean }> => {
      const url = EVALS_EXPERIMENT_EXECUTION_CANCEL_URL.replace(
        '{workflowExecutionId}',
        encodeURIComponent(workflowExecutionId)
      );
      return services.http!.post<{ cancelled: boolean }>(url, {
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

const TERMINAL_EXECUTION_STATUSES = new Set([
  'completed',
  'failed',
  'cancelled',
  'timed_out',
  'skipped',
]);

/** Whether a workflow execution status is final (no further progress expected). */
export const isTerminalExecutionStatus = (status: string): boolean =>
  TERMINAL_EXECUTION_STATUSES.has(status);

/** Poll interval (ms) for a still-running workflow execution. */
const WORKFLOW_EXECUTION_POLL_MS = 2000;
const DATASET_STEP_TYPE = 'evals.evaluateDataset';

/** The per-execution view the run-progress UI renders. */
export interface WorkflowExecutionView {
  id: string;
  data?: ExperimentExecutionStatus;
  isError: boolean;
}

export interface WorkflowExecutionsState {
  /** One entry per requested id, preserving order. */
  executions: WorkflowExecutionView[];
  /** True once every provided execution has reached a terminal status. */
  allSettled: boolean;
  /** True while at least one execution status has not loaded yet. */
  isLoading: boolean;
  /** Total scores ingested across every execution's dataset step(s) so far. */
  scoresIngested: number;
}

/** Total scores ingested across an execution's dataset step(s). */
export const sumScoresIngested = (execution?: ExperimentExecutionStatus): number =>
  (execution?.steps ?? []).reduce(
    (sum, step) =>
      step.step_type === DATASET_STEP_TYPE ? sum + (step.progress?.scores_ingested ?? 0) : sum,
    0
  );

/**
 * Polls every launched workflow execution from a single place and derives the
 * signals the detail page needs: the per-execution status (for the run-progress
 * UI), whether all runs have settled, and how many scores have been ingested so
 * far. Centralizing the poll here (instead of also polling per progress card)
 * avoids duplicate requests and the resulting render churn/flicker, and lets the
 * page defer querying the (initially non-existent) experiment document until
 * scores actually land — which is what stops the continuous 404s.
 */
export const useWorkflowExecutions = (workflowExecutionIds: string[]): WorkflowExecutionsState => {
  const { services } = useKibana();

  const results = useQueries({
    queries: workflowExecutionIds.map((workflowExecutionId) => ({
      queryKey: ['evals', 'workflow-execution', workflowExecutionId],
      queryFn: async (): Promise<ExperimentExecutionStatus> => {
        const url = EVALS_EXPERIMENT_EXECUTION_URL.replace(
          '{workflowExecutionId}',
          encodeURIComponent(workflowExecutionId)
        );
        return services.http!.get<ExperimentExecutionStatus>(url, {
          version: API_VERSIONS.internal.v1,
        });
      },
      enabled: workflowExecutionId.length > 0,
      refetchInterval: (data: ExperimentExecutionStatus | undefined) =>
        data && isTerminalExecutionStatus(data.status) ? false : WORKFLOW_EXECUTION_POLL_MS,
      retry: retryOnServerError,
    })),
  });

  const executions = workflowExecutionIds.map<WorkflowExecutionView>((id, index) => ({
    id,
    data: results[index]?.data,
    isError: !!results[index]?.isError,
  }));
  const isLoading = results.some((result) => result.isLoading);
  const allSettled =
    workflowExecutionIds.length > 0 &&
    results.every((result) => !!result.data && isTerminalExecutionStatus(result.data.status));
  const scoresIngested = executions.reduce((sum, view) => sum + sumScoresIngested(view.data), 0);

  return { executions, allSettled, isLoading, scoresIngested };
};
