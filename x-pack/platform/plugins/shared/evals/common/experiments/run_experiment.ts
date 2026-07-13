/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const experimentEvaluatorSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  connector_id: z.string().optional(),
});

export type ExperimentEvaluator = z.infer<typeof experimentEvaluatorSchema>;

export const runExperimentRequestSchema = z.object({
  name: z.string().optional(),
  connector_ids: z.array(z.string()).min(1),
  agent_id: z.string().optional(),
  tool_id: z.string().optional(),
  /** Explicit registered task provider id (overrides the agent/tool/inference inference). */
  task_ref: z.string().optional(),
  /** Free-form parameters forwarded to the task provider. */
  params: z.record(z.string(), z.unknown()).optional(),
  dataset_ids: z.array(z.string()).min(1),
  evaluators: z.array(experimentEvaluatorSchema).min(1),
  repetitions: z.number().int().min(1).optional(),
  concurrency: z.number().int().min(1).optional(),
  compare: z.boolean().optional(),
  workflow_id: z.string().optional(),
  space_ids: z.array(z.string().min(1)).min(1).optional(),
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

export interface LaunchedExperimentConfig {
  name?: string;
  /** Display label of the chosen task target (e.g. "Agent Builder agent (converse)"). */
  target_label: string;
  agent_id?: string;
  tool_id?: string;
  connector_names: string[];
  dataset_names: string[];
  evaluator_names: string[];
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
    tool_id?: string;
  };
}

export interface GetExperimentTemplatesResponse {
  templates: ExperimentTemplate[];
}

export interface PreviewExperimentResponse {
  yaml: string;
}

/** Compact progress counters extracted from the `evals.evaluateDataset` step state. */
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
