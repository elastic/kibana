/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { z } from '@kbn/zod/v4';
import {
  createServerStepDefinition,
  createPollServerStepDefinition,
} from '@kbn/workflows-extensions/server';
import type { ServerStepDefinition, StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  resolveDatasetCommonDefinition,
  executeTaskCommonDefinition,
  evaluateTraceCommonDefinition,
  ingestScoresCommonDefinition,
  evaluateExampleCommonDefinition,
  evaluateDatasetCommonDefinition,
  startExperimentCommonDefinition,
  compareExperimentsCommonDefinition,
} from '../../common/workflows/steps';
import type { EvalStepDeps } from './types';
import {
  buildExampleScoreBody,
  compareExperimentsPairwise,
  evaluateTrace,
  evaluateWorkBatch,
  flattenDatasetWork,
  ingestScores,
  resolveDatasets,
  resolveEvaluatorModel,
  runExampleEvaluation,
  runTask,
  toRunnerEvaluatorResults,
} from './lib';
import type { DatasetEvaluationConfig, StepRuntime } from './lib';

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_REPETITIONS = 1;

/** Number of examples drained per `poll()` invocation of `evals.evaluateDataset`. */
const POLL_BATCH_SIZE = 25;

/**
 * Poll ceilings for `evals.evaluateDataset`. The engine defaults (~1 min) are far
 * too low for real evaluation runs, so we raise them substantially; the generated
 * workflow additionally sets a high `settings.timeout`.
 */
const EVALUATE_DATASET_POLL_CEILINGS = { maxAttempts: 10_000, maxWaitMs: 60_000 } as const;

const stateExampleSchema = z.object({
  id: z.string(),
  index: z.number().int(),
  input: z.record(z.string(), z.unknown()).optional(),
  output: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

/** Progress persisted between `evals.evaluateDataset` poll cycles. */
const evaluateDatasetStateSchema = z.object({
  work: z.array(
    z.object({
      dataset: z.object({ id: z.string(), name: z.string() }),
      example: stateExampleSchema,
    })
  ),
  cursor: z.number().int(),
  completed: z.number().int(),
  failed: z.number().int(),
  scores_ingested: z.number().int(),
  errors: z.array(z.string()),
});

/** Cap on failure messages retained across poll cycles; keeps state/output bounded. */
const MAX_DATASET_STEP_ERRORS = 20;

/**
 * Creates the eight evals workflow step definitions. A factory is used so the
 * handlers can close over plugin services (inference, task provider registry)
 * that are not available on the workflow step context.
 */
export const createEvalsServerSteps = (deps: EvalStepDeps): ServerStepDefinition[] => {
  const makeRuntime = (context: StepHandlerContext): StepRuntime => ({
    logger: context.logger,
    abortSignal: context.abortSignal,
    callKibanaApi: (params) => context.contextManager.callKibanaApi(params),
    getInferenceClient: async (connectorId: string) => {
      const inference = await deps.getInferenceStart();
      const request = context.contextManager.getFakeRequest();
      return inference.getClient({ request, bindTo: { connectorId } });
    },
  });

  const resolveDatasetStep = createServerStepDefinition({
    ...resolveDatasetCommonDefinition,
    handler: async (context) => {
      const datasets = await resolveDatasets(makeRuntime(context), context.input.dataset_ids);
      return { output: { datasets } };
    },
  });

  const executeTaskStep = createServerStepDefinition({
    ...executeTaskCommonDefinition,
    handler: async (context) => {
      const { example, connector_id, agent_id, tool_id, task_ref, params } = context.input;
      const result = await runTask(
        deps.taskProviderRegistry,
        makeRuntime(context),
        {
          connectorId: connector_id,
          agentId: agent_id,
          toolId: tool_id,
          taskRef: task_ref,
          params,
        },
        example.input ?? {}
      );
      return { output: { output: result.output, trace_id: result.traceId } };
    },
  });

  const evaluateTraceStep = createServerStepDefinition({
    ...evaluateTraceCommonDefinition,
    handler: async (context) => {
      const { trace_id, reference_data, evaluators } = context.input;
      const { results } = await evaluateTrace(makeRuntime(context), {
        traceId: trace_id,
        referenceData: reference_data,
        evaluators,
      });
      return { output: { results } };
    },
  });

  const ingestScoresStep = createServerStepDefinition({
    ...ingestScoresCommonDefinition,
    handler: async (context) => {
      const { input } = context;
      const body = buildExampleScoreBody({
        experimentId: input.experiment_id,
        experimentName: input.experiment_name,
        executionId: input.execution_id,
        suiteId: input.suite_id,
        taskModel: input.task_model,
        evaluatorModel: input.evaluator_model ?? input.task_model,
        totalRepetitions: input.total_repetitions ?? DEFAULT_REPETITIONS,
        example: {
          id: input.example.id,
          index: input.example.index,
          input: input.example.input,
          dataset: input.example.dataset,
        },
        task: {
          traceId: input.task.trace_id,
          repetitionIndex: input.task.repetition_index,
          output: input.task.output,
        },
        evaluatorResults: toRunnerEvaluatorResults(input.evaluator_results),
      });
      const response = await ingestScores(makeRuntime(context), body);
      return {
        output: {
          ingested: response.ingested,
          conflicted: response.conflicted,
          failed: response.failed.length,
        },
      };
    },
  });

  const evaluateExampleStep = createServerStepDefinition({
    ...evaluateExampleCommonDefinition,
    handler: async (context) => {
      const { input } = context;
      const result = await runExampleEvaluation(deps.taskProviderRegistry, makeRuntime(context), {
        experimentId: input.experiment_id,
        executionId: input.execution_id,
        suiteId: input.suite_id,
        taskModel: input.task_model ?? { id: input.connector_id },
        evaluatorModel: resolveEvaluatorModel(input.evaluators, input.connector_id),
        target: {
          connectorId: input.connector_id,
          agentId: input.agent_id,
          toolId: input.tool_id,
          taskRef: input.task_ref,
          params: input.params,
        },
        dataset: input.dataset,
        example: {
          id: input.example.id,
          index: input.example.index ?? 0,
          input: input.example.input,
          output: input.example.output,
          metadata: input.example.metadata,
        },
        evaluators: input.evaluators,
        referenceData: input.reference_data,
        repetitions: input.repetitions ?? DEFAULT_REPETITIONS,
      });
      return {
        output: {
          scores_ingested: result.scoresIngested,
          failed: result.failed,
          repetitions: result.repetitions,
        },
      };
    },
  });

  const buildDatasetConfig = (input: {
    experiment_id: string;
    experiment_name?: string;
    execution_id?: string;
    suite_id?: string;
    task_model?: { id: string; family?: string; provider?: string };
    connector_id: string;
    agent_id?: string;
    tool_id?: string;
    task_ref?: string;
    params?: Record<string, unknown>;
    evaluators: Array<{ name: string; version?: string; connector_id?: string }>;
    repetitions?: number;
  }): DatasetEvaluationConfig => ({
    experimentId: input.experiment_id,
    experimentName: input.experiment_name,
    executionId: input.execution_id,
    suiteId: input.suite_id,
    taskModel: input.task_model ?? { id: input.connector_id },
    evaluatorModel: resolveEvaluatorModel(input.evaluators, input.connector_id),
    target: {
      connectorId: input.connector_id,
      agentId: input.agent_id,
      toolId: input.tool_id,
      taskRef: input.task_ref,
      params: input.params,
    },
    evaluators: input.evaluators,
    repetitions: input.repetitions ?? DEFAULT_REPETITIONS,
  });

  const evaluateDatasetStep = createPollServerStepDefinition({
    ...evaluateDatasetCommonDefinition,
    stateSchema: evaluateDatasetStateSchema,
    ceilings: EVALUATE_DATASET_POLL_CEILINGS,
    start: async (context) => {
      const { input } = context;
      const datasets = await resolveDatasets(makeRuntime(context), input.dataset_ids);
      const work = flattenDatasetWork(datasets);
      if (work.length === 0) {
        return {
          output: {
            experiment_id: input.experiment_id,
            example_count: 0,
            completed: 0,
            failed: 0,
            scores_ingested: 0,
            errors: [],
          },
        };
      }
      return {
        state: { work, cursor: 0, completed: 0, failed: 0, scores_ingested: 0, errors: [] },
      };
    },
    poll: async (context) => {
      const runtime = makeRuntime(context);
      const { input, state } = context;
      if (!state) {
        return { error: new Error('evals.evaluateDataset poll invoked without persisted state') };
      }
      if (runtime.abortSignal.aborted) {
        return { error: new Error('Dataset evaluation was cancelled') };
      }

      const concurrency = input.concurrency ?? DEFAULT_CONCURRENCY;
      const batchSize = Math.max(concurrency, POLL_BATCH_SIZE);
      const batch = state.work.slice(state.cursor, state.cursor + batchSize);
      const batchResult = await evaluateWorkBatch(
        deps.taskProviderRegistry,
        runtime,
        buildDatasetConfig(input),
        batch,
        concurrency
      );

      const cursor = state.cursor + batch.length;
      const nextState = {
        work: state.work,
        cursor,
        completed: state.completed + batchResult.completed,
        failed: state.failed + batchResult.failed,
        scores_ingested: state.scores_ingested + batchResult.scoresIngested,
        errors: [...state.errors, ...batchResult.errors].slice(0, MAX_DATASET_STEP_ERRORS),
      };

      if (cursor >= state.work.length) {
        return {
          output: {
            experiment_id: input.experiment_id,
            example_count: state.work.length,
            completed: nextState.completed,
            failed: nextState.failed,
            scores_ingested: nextState.scores_ingested,
            errors: nextState.errors,
          },
        };
      }
      return { state: nextState };
    },
    onCancel: (context) => {
      context.logger.info(
        'evals.evaluateDataset cancelled; in-flight evaluations aborted via signal'
      );
    },
  });

  const startExperimentStep = createServerStepDefinition({
    ...startExperimentCommonDefinition,
    handler: async (context) => {
      const { input } = context;
      // Mint a fresh execution id per experiment when one is not inlined (saved /
      // scheduled workflows). Falling back to the workflow execution id would make
      // every model in a sequential cross-model workflow share one execution id and
      // collapse into a single list row; a fresh id gives each model its own row,
      // symmetric with `experiment_id`. "Run now" always inlines `execution_id`.
      const executionId = input.execution_id ?? randomUUID();
      const experimentId = input.experiment_id ?? randomUUID();
      return { output: { experiment_id: experimentId, execution_id: executionId } };
    },
  });

  const compareExperimentsStep = createServerStepDefinition({
    ...compareExperimentsCommonDefinition,
    handler: async (context) => {
      const comparison = await compareExperimentsPairwise(
        makeRuntime(context),
        context.input.experiment_ids
      );
      return { output: { comparison } };
    },
  });

  return [
    resolveDatasetStep,
    executeTaskStep,
    evaluateTraceStep,
    ingestScoresStep,
    evaluateExampleStep,
    evaluateDatasetStep,
    startExperimentStep,
    compareExperimentsStep,
  ];
};
