/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import {
  StartExperimentStepId,
  EvaluateDatasetStepId,
  CompareExperimentsStepId,
} from '../common/workflows/steps';
import { EVALS_WORKFLOW_TAGS } from '../common/experiments/run_experiment';
import type { RunExperimentRequest } from '../common/experiments/run_experiment';

/**
 * Translates a user's experiment form into runnable workflow YAML.
 *
 * The evals UI never asks the user to choose a workflow topology; the structure
 * is *inferred* from the inputs (see the "one shape, fits all cases" section of
 * the plan). The two entry points are:
 *
 * - {@link generateExperimentRun} — for "Run now". Produces one or more
 *   **concurrent** executions (fan-out) so large / cross-model experiments run
 *   in parallel across Task Manager workers. Values are inlined per execution.
 * - {@link generateSavedWorkflowYaml} — for "Save as workflow". Produces a
 *   single, self-contained workflow definition that re-generates fresh ids on
 *   every (possibly scheduled) run, so repeated runs form comparable, distinct
 *   experiments. Cross-model saved workflows run sequentially and, when `compare`
 *   is requested, end with a `ai.evals.compareExperiments` step.
 *
 * The engine does not execute `parallel` today, so cross-model parallelism is
 * achieved via execution fan-out in "Run now"; the saved-workflow form stays
 * single-execution (sequential) and relies on the compare step.
 */

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_REPETITIONS = 1;
const DEFAULT_WORKFLOW_TIMEOUT = '24h';

/** Above this many datasets (single model), fan out one execution per dataset. */
export const DATASET_FANOUT_THRESHOLD = 5;

/**
 * Conservative stand-in for `xpack.task_manager.capacity` (default 10). Used to
 * spread a single global concurrency budget across fanned-out executions so that
 * `concurrentExecutions × perExecutionConcurrency` stays within the connector's
 * rate limit rather than multiplying it.
 */
export const TASK_MANAGER_CAPACITY = 10;

export interface WorkflowEvaluatorInput {
  name: string;
  version?: string;
  /** Judge connector; required by the evaluator API for `llm` evaluators. */
  connector_id?: string;
}

/** Maps the (snake_case) HTTP request body to the generator's camelCase params. */
export const experimentRequestToParams = (
  body: RunExperimentRequest
): GenerateExperimentParams => ({
  name: body.name,
  connectorIds: body.connector_ids,
  agentId: body.agent_id,
  taskRef: body.task_ref,
  params: body.params,
  datasetIds: body.dataset_ids,
  evaluators: body.evaluators,
  repetitions: body.repetitions,
  concurrency: body.concurrency,
  compare: body.compare,
  spaceIds: body.space_ids,
});

export interface GenerateExperimentParams {
  name?: string;
  connectorIds: string[];
  agentId?: string;
  taskRef?: string;
  params?: Record<string, unknown>;
  datasetIds: string[];
  evaluators: WorkflowEvaluatorInput[];
  repetitions?: number;
  concurrency?: number;
  compare?: boolean;
  /**
   * Spaces the produced scores are assigned to. When omitted, the ingest step falls back to the workflow's space.
   */
  spaceIds?: string[];
}

export type ExperimentRunMode = 'single' | 'dataset-fanout' | 'cross-model';

export interface GeneratedExecution {
  yaml: string;
  connectorId: string;
  datasetIds: string[];
  executionId: string;
  experimentId?: string;
}

export interface GeneratedExperimentRun {
  executionId: string;
  executions: GeneratedExecution[];
  experimentIds: string[];
  mode: ExperimentRunMode;
  compareBy: 'execution' | 'experiment';
}

interface TaskTargetValues {
  connectorId: string;
  agentId?: string;
  taskRef?: string;
  params?: Record<string, unknown>;
}

interface EvaluateStepValues extends TaskTargetValues {
  experimentName?: string;
  datasetIds: string[];
  evaluators: WorkflowEvaluatorInput[];
  repetitions: number;
  concurrency: number;
  spaceIds?: string[];
}

const omitUndefined = <T extends Record<string, unknown>>(value: T): T => {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
};

/**
 * Splits a global concurrency budget across the executions that Task Manager can
 * run at once, so the aggregate parallelism stays within the connector's rate
 * limit instead of `executions × concurrency`.
 */
const perExecutionConcurrency = (globalConcurrency: number, executionCount: number): number => {
  const concurrentExecutions = Math.min(executionCount, TASK_MANAGER_CAPACITY);
  return Math.max(1, Math.floor(globalConcurrency / concurrentExecutions));
};

const buildStartStep = (
  name: string,
  connectorId: string,
  ids?: { experimentId?: string; executionId?: string }
) => ({
  name,
  type: StartExperimentStepId,
  with: omitUndefined({
    task_model: { id: connectorId },
    experiment_id: ids?.experimentId,
    execution_id: ids?.executionId,
  }),
});

const buildEvaluateStep = (name: string, startStepName: string, values: EvaluateStepValues) => ({
  name,
  type: EvaluateDatasetStepId,
  with: omitUndefined({
    experiment_id: `{{ steps.${startStepName}.output.experiment_id }}`,
    experiment_name: values.experimentName,
    execution_id: `{{ steps.${startStepName}.output.execution_id }}`,
    connector_id: values.connectorId,
    agent_id: values.agentId,
    task_ref: values.taskRef,
    params: values.params,
    dataset_ids: values.datasetIds,
    evaluators: values.evaluators,
    repetitions: values.repetitions,
    concurrency: values.concurrency,
    space_ids: values.spaceIds,
  }),
});

const buildWorkflowShell = (
  name: string,
  description: string,
  steps: Array<Record<string, unknown>>
) => ({
  version: '1',
  name,
  description,
  enabled: true,
  tags: [...EVALS_WORKFLOW_TAGS],
  settings: { timeout: DEFAULT_WORKFLOW_TIMEOUT },
  triggers: [{ type: 'manual' }],
  steps,
});

const defaultRunName = (params: GenerateExperimentParams): string => {
  const target = params.agentId ? `agent ${params.agentId}` : params.connectorIds.join(', ');
  return params.name ?? `Evaluate ${target}`;
};

/**
 * Builds the fan-out plan and per-execution YAML for a "Run now" request.
 *
 * - `connectorIds.length >= 2` → cross-model: one execution per model, sharing a
 *   generated `execution_id`; each execution's `startExperiment` mints its own
 *   `experiment_id` (compare by execution).
 * - single model, `datasetIds.length > DATASET_FANOUT_THRESHOLD` → dataset
 *   fan-out: one execution per dataset, all sharing one route-generated
 *   `experiment_id` (they remain one experiment) and `execution_id`.
 * - otherwise → a single pooled execution over all `dataset_ids`.
 */
export const generateExperimentRun = (params: GenerateExperimentParams): GeneratedExperimentRun => {
  const connectorIds = [...new Set(params.connectorIds)];
  if (connectorIds.length === 0) {
    throw new Error('At least one connector_id is required to generate an experiment');
  }
  if (params.datasetIds.length === 0) {
    throw new Error('At least one dataset_id is required to generate an experiment');
  }

  const executionId = randomUUID();
  const concurrency = params.concurrency ?? DEFAULT_CONCURRENCY;
  const repetitions = params.repetitions ?? DEFAULT_REPETITIONS;
  const baseName = defaultRunName(params);

  const commonTarget = {
    agentId: params.agentId,
    taskRef: params.taskRef,
    params: params.params,
    evaluators: params.evaluators,
    repetitions,
    spaceIds: params.spaceIds,
  };

  if (connectorIds.length >= 2) {
    const stepConcurrency = perExecutionConcurrency(concurrency, connectorIds.length);
    const executions = connectorIds.map<GeneratedExecution>((connectorId) => {
      // Each model is its own experiment and its own list row, so it gets its own
      // execution id (derived from the shared launch id, mirroring the offline
      // runner's `base::suite::model` scheme). Sharing one execution id across
      // models would collapse them into a single row and merge their scores in the
      // execution-scoped detail view.
      const modelExecutionId = `${executionId}::${connectorId}`;
      const steps = [
        buildStartStep('start', connectorId, { executionId: modelExecutionId }),
        buildEvaluateStep('evaluate', 'start', {
          ...commonTarget,
          // Every model in a cross-model run is the SAME named experiment; the model is
          // carried on `task.model.id` (shown as its own column), not mangled into the
          // name. Matches the offline runner, which keeps `experimentName` identical
          // across models and disambiguates only via the experiment id.
          experimentName: baseName,
          connectorId,
          datasetIds: params.datasetIds,
          concurrency: stepConcurrency,
        }),
      ];
      return {
        yaml: stringifyWorkflowDefinition(
          buildWorkflowShell(`${baseName} (${connectorId})`, 'Cross-model evaluation run', steps)
        ),
        connectorId,
        datasetIds: params.datasetIds,
        executionId: modelExecutionId,
      };
    });

    return {
      executionId,
      executions,
      experimentIds: [],
      mode: 'cross-model',
      compareBy: 'execution',
    };
  }

  const connectorId = connectorIds[0];
  const experimentId = randomUUID();

  if (params.datasetIds.length > DATASET_FANOUT_THRESHOLD) {
    const stepConcurrency = perExecutionConcurrency(concurrency, params.datasetIds.length);
    const executions = params.datasetIds.map<GeneratedExecution>((datasetId) => {
      const steps = [
        buildStartStep('start', connectorId, { experimentId, executionId }),
        buildEvaluateStep('evaluate', 'start', {
          ...commonTarget,
          experimentName: baseName,
          connectorId,
          datasetIds: [datasetId],
          concurrency: stepConcurrency,
        }),
      ];
      return {
        yaml: stringifyWorkflowDefinition(
          buildWorkflowShell(`${baseName} (${datasetId})`, 'Dataset shard evaluation run', steps)
        ),
        connectorId,
        datasetIds: [datasetId],
        experimentId,
        executionId,
      };
    });

    return {
      executionId,
      executions,
      experimentIds: [experimentId],
      mode: 'dataset-fanout',
      compareBy: 'experiment',
    };
  }

  const steps = [
    buildStartStep('start', connectorId, { experimentId, executionId }),
    buildEvaluateStep('evaluate', 'start', {
      ...commonTarget,
      experimentName: baseName,
      connectorId,
      datasetIds: params.datasetIds,
      concurrency,
    }),
  ];

  return {
    executionId,
    executions: [
      {
        yaml: stringifyWorkflowDefinition(
          buildWorkflowShell(baseName, 'Evaluation experiment run', steps)
        ),
        connectorId,
        datasetIds: params.datasetIds,
        experimentId,
        executionId,
      },
    ],
    experimentIds: [experimentId],
    mode: 'single',
    compareBy: 'experiment',
  };
};

export interface GeneratedSavedWorkflow {
  yaml: string;
  name: string;
}

/**
 * Builds a single, self-contained workflow definition for "Save as workflow".
 *
 * Unlike {@link generateExperimentRun}, ids are NOT inlined — `startExperiment`
 * mints a fresh `experiment_id` (and `execution_id`) on every run so scheduled
 * re-runs produce distinct, comparable experiments. Cross-model saved workflows
 * run each model sequentially and, when `compare` is requested, finish with
 * `ai.evals.compareExperiments` over the per-model experiment ids.
 */
export const generateSavedWorkflowYaml = (
  params: GenerateExperimentParams
): GeneratedSavedWorkflow => {
  const connectorIds = [...new Set(params.connectorIds)];
  if (connectorIds.length === 0) {
    throw new Error('At least one connector_id is required to generate an experiment');
  }
  if (params.datasetIds.length === 0) {
    throw new Error('At least one dataset_id is required to generate an experiment');
  }

  const concurrency = params.concurrency ?? DEFAULT_CONCURRENCY;
  const repetitions = params.repetitions ?? DEFAULT_REPETITIONS;
  const name = defaultRunName(params);

  const commonTarget = {
    agentId: params.agentId,
    taskRef: params.taskRef,
    params: params.params,
    evaluators: params.evaluators,
    repetitions,
    concurrency,
    datasetIds: params.datasetIds,
    spaceIds: params.spaceIds,
  };

  if (connectorIds.length < 2) {
    const steps = [
      buildStartStep('start', connectorIds[0]),
      buildEvaluateStep('evaluate', 'start', {
        ...commonTarget,
        experimentName: name,
        connectorId: connectorIds[0],
      }),
    ];
    return {
      name,
      yaml: stringifyWorkflowDefinition(
        buildWorkflowShell(name, 'Saved evaluation experiment', steps)
      ),
    };
  }

  // Cross-model saved workflow: sequential (start, evaluate) per model, then compare.
  const steps: Array<Record<string, unknown>> = [];
  const startStepNames: string[] = [];
  connectorIds.forEach((connectorId, index) => {
    const startName = `start_${index}`;
    const evaluateName = `evaluate_${index}`;
    startStepNames.push(startName);
    steps.push(buildStartStep(startName, connectorId));
    steps.push(
      buildEvaluateStep(evaluateName, startName, {
        ...commonTarget,
        experimentName: name,
        connectorId,
      })
    );
  });
  // The compare step is opt-in (the "Compare models after run" checkbox): each model
  // is already its own experiment/row, so a pairwise comparison is only appended when
  // explicitly requested.
  if (params.compare) {
    steps.push({
      name: 'compare',
      type: CompareExperimentsStepId,
      with: {
        experiment_ids: startStepNames.map((s) => `{{ steps.${s}.output.experiment_id }}`),
      },
    });
  }

  return {
    name,
    yaml: stringifyWorkflowDefinition(
      buildWorkflowShell(name, 'Saved cross-model evaluation experiment', steps)
    ),
  };
};
