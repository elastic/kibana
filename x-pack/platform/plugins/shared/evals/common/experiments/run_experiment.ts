/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { WorkflowDetailDto } from '@kbn/workflows';

export const MAX_ID_LENGTH = 1024;
export const MAX_NAME_LENGTH = 256;

export const EVALS_EXPERIMENT_WORKFLOW_TAG = 'evals-experiment';
export const EVALS_WORKFLOW_TAGS = ['evals', EVALS_EXPERIMENT_WORKFLOW_TAG] as const;

export const isEvalsOwnedWorkflow = (
  workflow: Pick<WorkflowDetailDto, 'definition'> | null | undefined
): boolean => Boolean(workflow?.definition?.tags?.includes(EVALS_EXPERIMENT_WORKFLOW_TAG));

export const experimentEvaluatorSchema = z.object({
  name: z.string().max(MAX_NAME_LENGTH),
  version: z.string().max(MAX_NAME_LENGTH).optional(),
  connector_id: z.string().max(MAX_ID_LENGTH).optional(),
});

export type ExperimentEvaluator = z.infer<typeof experimentEvaluatorSchema>;

export const EXPERIMENT_LIMITS = {
  maxConnectorIds: 50,
  maxDatasetIds: 50,
  maxEvaluators: 50,
  maxRepetitions: 100,
  maxConcurrency: 50,
  maxSpaceIds: 100,
} as const;

export const runExperimentRequestSchema = z.object({
  name: z.string().max(MAX_NAME_LENGTH).optional(),
  connector_ids: z
    .array(z.string().max(MAX_ID_LENGTH))
    .min(1)
    .max(EXPERIMENT_LIMITS.maxConnectorIds),
  agent_id: z.string().max(MAX_ID_LENGTH).optional(),
  /** Explicit registered task provider id (overrides the agent/inference resolution). */
  task_ref: z.string().max(MAX_ID_LENGTH).optional(),
  /** Free-form parameters forwarded to the task provider. */
  params: z.record(z.string().max(MAX_NAME_LENGTH), z.unknown()).optional(),
  dataset_ids: z.array(z.string().max(MAX_ID_LENGTH)).min(1).max(EXPERIMENT_LIMITS.maxDatasetIds),
  evaluators: z.array(experimentEvaluatorSchema).min(1).max(EXPERIMENT_LIMITS.maxEvaluators),
  repetitions: z.number().int().min(1).max(EXPERIMENT_LIMITS.maxRepetitions).optional(),
  concurrency: z.number().int().min(1).max(EXPERIMENT_LIMITS.maxConcurrency).optional(),
  compare: z.boolean().optional(),
  workflow_id: z.string().max(MAX_ID_LENGTH).optional(),
  space_ids: z
    .array(z.string().min(1).max(MAX_NAME_LENGTH))
    .min(1)
    .max(EXPERIMENT_LIMITS.maxSpaceIds)
    .optional(),
});

export type RunExperimentRequest = z.infer<typeof runExperimentRequestSchema>;

export const EXPERIMENT_RUN_MODES = ['single', 'dataset-fanout', 'cross-model'] as const;
export type ExperimentRunMode = (typeof EXPERIMENT_RUN_MODES)[number];

/** One launched execution: its model connector, score-grouping id, and workflow run id. */
export interface LaunchedExecution {
  execution_id: string;
  connector_id: string;
  workflow_execution_id: string;
}

export interface RunExperimentResponse {
  execution_id: string;
  mode: ExperimentRunMode;
  compare_by: 'execution' | 'experiment';
  experiment_ids: string[];
  workflow_execution_ids: string[];
  executions: LaunchedExecution[];
}

export interface SaveAsWorkflowResponse {
  workflow_id: string;
  name: string;
}

/** An LLM evaluator paired with the display label of the connector it judges with. */
export interface LaunchedExperimentJudge {
  evaluator_name: string;
  judge_label: string;
}

export interface LaunchedExperimentConfig {
  name?: string;
  /** Display label of the chosen task target (e.g. "Agent Builder agent (converse)"). */
  target_label: string;
  agent_id?: string;
  connector_names: string[];
  dataset_names: string[];
  evaluator_names: string[];
  /** Only LLM evaluators appear here. Code evaluators invoke no model. */
  evaluator_judges?: LaunchedExperimentJudge[];
  repetitions?: number;
  concurrency?: number;
}

export interface ExperimentTemplate {
  /** Stable id - a task provider name for `task_provider` templates. */
  id: string;
  name: string;
  description?: string;
  kind: 'starter' | 'task_provider';
  /** Hints for pre-filling the new-experiment form when the template is chosen. */
  prefill?: {
    task_ref?: string;
    agent_id?: string;
  };
}

export interface GetExperimentTemplatesResponse {
  templates: ExperimentTemplate[];
}

export interface PreviewExperimentResponse {
  yaml: string;
}

/** Compact progress counters extracted from the `ai.evals.evaluateDataset` step state. */
export interface ExperimentStepProgress {
  total?: number;
  completed?: number;
  failed?: number;
  scores_ingested?: number;
  errors?: string[];
}

export interface ExperimentExecutionStepStatus {
  step_id: string;
  step_type?: string;
  /** Mirrors the Workflows engine `ExecutionStatus` (e.g. `running`, `completed`, `failed`). */
  status: string;
  progress?: ExperimentStepProgress;
  error?: string;
}

export interface ExperimentExecutionStatus {
  id: string;
  /** Mirrors the Workflows engine `ExecutionStatus`. */
  status: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
  steps: ExperimentExecutionStepStatus[];
}
