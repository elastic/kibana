/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * The shared contract for the "new experiment" form. The same payload drives
 * both "Run now" ({@link runExperimentRequestSchema} -> `POST .../experiments/_run`)
 * and "Save as workflow" (`POST .../experiments/_save_as_workflow`); the server
 * infers the workflow topology (single, dataset fan-out, or cross-model) from the
 * inputs, so the client never has to describe steps.
 */

export const experimentEvaluatorSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  /** Per-evaluator judge connector; required by the evaluator API for `llm` evaluators. */
  connector_id: z.string().optional(),
});
export type ExperimentEvaluator = z.infer<typeof experimentEvaluatorSchema>;

export const runExperimentRequestSchema = z.object({
  /** Optional human-readable name; a default is derived from the task target. */
  name: z.string().optional(),
  /** Models under evaluation. Two or more triggers a cross-model comparison. */
  connector_ids: z.array(z.string()).min(1),
  /** Agent Builder agent id (routes the task to the `agentBuilder.converse` provider). */
  agent_id: z.string().optional(),
  /** Agent Builder tool id (routes the task to the `agentBuilder.tool` provider). */
  tool_id: z.string().optional(),
  /** Explicit registered task provider id (overrides the agent/tool/inference inference). */
  task_ref: z.string().optional(),
  /** Free-form parameters forwarded to the task provider. */
  params: z.record(z.string(), z.unknown()).optional(),
  dataset_ids: z.array(z.string()).min(1),
  evaluators: z.array(experimentEvaluatorSchema).min(1),
  repetitions: z.number().int().min(1).optional(),
  concurrency: z.number().int().min(1).optional(),
  /**
   * Opt in to appending an `evals.compareExperiments` step when saving a
   * cross-model (2+ connectors) workflow. No effect on "Run now" or single-model
   * runs. Defaults to false.
   */
  compare: z.boolean().optional(),
});
export type RunExperimentRequest = z.infer<typeof runExperimentRequestSchema>;

export const EXPERIMENT_RUN_MODES = ['single', 'dataset-fanout', 'cross-model'] as const;
export type ExperimentRunMode = (typeof EXPERIMENT_RUN_MODES)[number];

/** One launched execution: its model connector, score-grouping id, and workflow run id. */
export interface LaunchedExecution {
  /** The `metadata.execution_id` its score docs are grouped under (one list row). */
  execution_id: string;
  /** The model connector evaluated by this execution. */
  connector_id: string;
  /** The workflow execution id to poll for progress / view in the Workflows app. */
  workflow_execution_id: string;
}

export interface RunExperimentResponse {
  /** Representative/launch id; equals the single execution id for single-model runs. */
  execution_id: string;
  mode: ExperimentRunMode;
  /** Whether the resulting run should be compared/queried by execution or experiment id. */
  compare_by: 'execution' | 'experiment';
  /** Known experiment ids (single-model / shard runs); empty for cross-model. */
  experiment_ids: string[];
  /** The launched workflow execution ids, one per fanned-out execution. */
  workflow_execution_ids: string[];
  /**
   * Per-launched-execution mapping (model connector, its execution id, and its
   * workflow execution id). For cross-model runs each entry is a distinct model /
   * list row; usable by API callers to locate each model's results.
   */
  executions: LaunchedExecution[];
}

export interface SaveAsWorkflowResponse {
  workflow_id: string;
  name: string;
}

/**
 * A human-readable snapshot of the submitted "new experiment" form. It is passed
 * to the experiment detail page via router navigation state so the configuration
 * stays visible while the run is still in flight (before it produces any
 * queryable results). Display names are resolved by the form, so the detail page
 * needs no extra lookups.
 */
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
  /** Stable id — a task provider name for `task_provider` templates. */
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
  /** The generated, human-readable workflow YAML for the current form inputs. */
  yaml: string;
}

/** Compact progress counters extracted from the `evals.evaluateDataset` step state. */
export interface ExperimentStepProgress {
  total?: number;
  completed?: number;
  failed?: number;
  scores_ingested?: number;
  /** Sample of failure messages captured from failed examples. */
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
