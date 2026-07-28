/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import type { BoundInferenceClient } from '@kbn/inference-common';
import {
  EVALS_EVALUATE_URL,
  EVALS_SCORES_URL,
  EVALS_DATASET_URL,
  EVALS_EXPERIMENTS_COMPARE_URL,
  API_VERSIONS,
} from '@kbn/evals-common';
import type {
  CompareExperimentsResponse,
  EvaluateResponse,
  IngestScoresRequestBody,
  IngestScoresResponse,
  Model,
} from '@kbn/evals-common';
import { buildScoreDocuments, mapWithConcurrency, ConcurrencyAbortError } from '@kbn/evals-runner';
import type { EvaluatorResult, RunnerExample } from '@kbn/evals-runner';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { BUILT_IN_TASK_PROVIDERS } from '../task_providers/types';
import type { InstrumentationProfile } from '../evaluators/evidence/types';
import type {
  EvalsCallKibanaApi,
  EvalsStepLogger,
  EvalsTaskResult,
  TaskProviderRegistry,
} from '../task_providers/types';

const INTERNAL_API_HEADERS = { 'elastic-api-version': API_VERSIONS.internal.v1 } as const;

const HOSTNAME = os.hostname();

/** Runtime primitives a step handler passes down to the shared helpers. */
export interface StepRuntime {
  logger: EvalsStepLogger;
  abortSignal: AbortSignal;
  callKibanaApi: EvalsCallKibanaApi;
  getInferenceClient: (connectorId: string) => Promise<BoundInferenceClient>;
  resolveModel: (connectorId: string) => Promise<Model>;
  spaceId: string;
}

export interface TaskTarget {
  connectorId: string;
  agentId?: string;
  taskRef?: string;
  params?: Record<string, unknown>;
}

export interface EvaluatorConfig {
  name: string;
  version?: string;
  connector_id?: string;
}

/** Chooses the task provider id from the target: task_ref > agent_id > inference. */
export const resolveTaskProviderName = ({ taskRef, agentId }: TaskTarget): string => {
  if (taskRef) {
    return taskRef;
  }
  if (agentId) {
    return BUILT_IN_TASK_PROVIDERS.agentBuilderConverse;
  }
  return BUILT_IN_TASK_PROVIDERS.inference;
};

/** Runs the feature under evaluation for a single example via the resolved provider. */
export const runTask = async (
  registry: TaskProviderRegistry,
  runtime: StepRuntime,
  target: TaskTarget,
  input: Record<string, unknown>
): Promise<EvalsTaskResult> => {
  const providerName = resolveTaskProviderName(target);
  const provider = registry.get(providerName);
  if (!provider) {
    throw new Error(`Unknown task provider "${providerName}"`);
  }
  return provider.run({
    input,
    connectorId: target.connectorId,
    agentId: target.agentId,
    params: target.params,
    logger: runtime.logger,
    abortSignal: runtime.abortSignal,
    getInferenceClient: runtime.getInferenceClient,
    callKibanaApi: runtime.callKibanaApi,
  });
};

/** The graded scores plus any evaluator-level failures returned by `/_evaluate`. */
export interface EvaluateTraceResult {
  results: EvaluatorResult[];
  errors: string[];
}

/** Grades a single trace against the configured evaluators via `POST /_evaluate`. */
export const evaluateTrace = async (
  runtime: StepRuntime,
  params: {
    traceId: string;
    referenceData?: Record<string, unknown>;
    evaluators: EvaluatorConfig[];
    instrumentation?: { profile: InstrumentationProfile };
  }
): Promise<EvaluateTraceResult> => {
  const { body } = await runtime.callKibanaApi<EvaluateResponse>({
    method: 'POST',
    path: EVALS_EVALUATE_URL,
    headers: INTERNAL_API_HEADERS,
    body: {
      subject: {
        mode: 'single-turn',
        traces: [
          {
            trace_id: params.traceId,
            ...(params.referenceData ? { reference_data: params.referenceData } : {}),
          },
        ],
        ...(params.instrumentation ? { instrumentation: params.instrumentation } : {}),
      },
      evaluators: params.evaluators,
    },
  });

  const allResults = body.results ?? [];

  const results = allResults
    .filter((result) => result.status === 'ok' && Array.isArray(result.scores))
    .map((result) => ({
      evaluator: result.evaluator,
      scores: (result.scores ?? []).map((score) => ({
        name: score.name,
        score: score.score,
        label: score.label,
        explanation: score.explanation,
        metadata: score.metadata,
      })),
    }));

  const errors = allResults
    .filter((result) => result.status === 'error')
    .map((result) => {
      const message = `Evaluator "${result.evaluator?.name ?? 'unknown'}" failed: ${
        result.error?.message ?? 'unknown error'
      }`;
      runtime.logger.warn(message);
      return message;
    });

  return { results, errors };
};

/** Persists a batch of score documents via `POST /scores`, stamped with the workflow's space. */
export const ingestScores = async (
  runtime: StepRuntime,
  body: IngestScoresRequestBody
): Promise<IngestScoresResponse> => {
  const { body: response } = await runtime.callKibanaApi<IngestScoresResponse>({
    method: 'POST',
    path: EVALS_SCORES_URL,
    headers: INTERNAL_API_HEADERS,
    // The internal ingest call is not space-prefixed, so stamp the workflow's space
    // explicitly. Otherwise the ingest route would resolve it to the default space.
    body: { ...body, space_ids: body.space_ids ?? [runtime.spaceId] },
  });
  return response;
};

/** The snake_case evaluator-result shape used by the workflow step schemas. */
export interface SnakeEvaluatorResult {
  evaluator: { name: string; version?: string; kind?: 'llm' | 'code' };
  scores: Array<{
    name: string;
    score?: number | null;
    label?: string | null;
    explanation?: string | null;
    metadata?: Record<string, unknown>;
    trace_id?: string | null;
  }>;
}

/** Converts the step's snake_case evaluator results into the runtime camelCase shape. */
export const toRunnerEvaluatorResults = (results: SnakeEvaluatorResult[]): EvaluatorResult[] =>
  results.map((result) => ({
    evaluator: result.evaluator,
    scores: result.scores.map((score) => ({
      name: score.name,
      score: score.score,
      label: score.label,
      explanation: score.explanation,
      metadata: score.metadata,
      traceId: score.trace_id,
    })),
  }));

export interface BuildExampleScoreBodyParams {
  experimentId: string;
  experimentName?: string;
  executionId?: string;
  suiteId?: string;
  taskModel: Model;
  evaluatorModel: Model;
  totalRepetitions: number;
  example: {
    id: string;
    index: number;
    input?: Record<string, unknown>;
    dataset: { id: string; name: string };
  };
  task: { traceId?: string; repetitionIndex: number; output?: Record<string, unknown> };
  evaluatorResults: EvaluatorResult[];
  /** Spaces to assign the scores to; falls back to the workflow space at ingest. */
  spaceIds?: string[];
}

/** Builds the `POST /scores` request body for a single (example, repetition). */
export const buildExampleScoreBody = (
  params: BuildExampleScoreBodyParams
): IngestScoresRequestBody => {
  const body = buildScoreDocuments({
    experimentId: params.experimentId,
    experimentName: params.experimentName,
    taskModel: params.taskModel,
    evaluatorModel: params.evaluatorModel,
    metadata: {
      executionId: params.executionId,
      suiteId: params.suiteId,
      totalRepetitions: params.totalRepetitions,
      hostname: HOSTNAME,
    },
    example: params.example,
    task: params.task,
    evaluatorResults: params.evaluatorResults,
  });
  return params.spaceIds && params.spaceIds.length > 0
    ? { ...body, space_ids: params.spaceIds }
    : body;
};

export interface ResolvedDataset {
  id: string;
  name: string;
  description?: string;
  examples: RunnerExample[];
}

interface GetDatasetApiResponse {
  id: string;
  name: string;
  description?: string;
  examples: Array<{
    id: string;
    input?: Record<string, unknown>;
    output?: unknown;
    metadata?: Record<string, unknown>;
  }>;
}

/** Loads datasets (and their examples) by id via `GET /datasets/{id}`. */
export const resolveDatasets = async (
  runtime: StepRuntime,
  datasetIds: string[]
): Promise<ResolvedDataset[]> => {
  return Promise.all(
    datasetIds.map(async (datasetId) => {
      const { body } = await runtime.callKibanaApi<GetDatasetApiResponse>({
        method: 'GET',
        path: EVALS_DATASET_URL.replace('{datasetId}', encodeURIComponent(datasetId)),
        headers: INTERNAL_API_HEADERS,
      });
      return {
        id: body.id,
        name: body.name,
        description: body.description,
        examples: body.examples.map((example, index) => ({
          id: example.id,
          index,
          input: example.input,
          output: example.output,
          metadata: example.metadata ?? null,
        })),
      };
    })
  );
};

/** A single (dataset, example) unit of work for the evaluation pool. */
export interface DatasetWorkItem {
  dataset: { id: string; name: string };
  example: RunnerExample;
}

/**
 * Flattens resolved datasets into a single work list so every example — across
 * dataset boundaries — shares one concurrency pool (scores stay tagged per
 * dataset). See the "Performance strategy" section of the plan.
 */
export const flattenDatasetWork = (datasets: ResolvedDataset[]): DatasetWorkItem[] =>
  datasets.flatMap((dataset) =>
    dataset.examples.map((example) => ({
      dataset: { id: dataset.id, name: dataset.name },
      example,
    }))
  );

export interface EvaluateExampleParams {
  experimentId: string;
  experimentName?: string;
  executionId?: string;
  suiteId?: string;
  taskModel: Model;
  evaluatorModel: Model;
  target: TaskTarget;
  dataset: { id: string; name: string };
  example: RunnerExample;
  evaluators: EvaluatorConfig[];
  referenceData?: Record<string, unknown>;
  repetitions: number;
  spaceIds?: string[];
}

export interface EvaluateExampleResult {
  scoresIngested: number;
  failed: number;
  repetitions: number;
  errors: string[];
}

const MAX_ERROR_MESSAGE_LENGTH = 500;

const toErrorMessage = (error: unknown): string => {
  let message: string;
  if (error instanceof KibanaApiCallError) {
    // `callKibanaApi` wraps non-2xx responses as `HTTP <status>: <json body>`. For the
    // run-progress UI, surface the clean server-provided message (`body.message`) instead
    // of the raw HTTP envelope. Fall back to the wrapped message if the body has none.
    const body = error.body as { message?: unknown } | undefined;
    message =
      typeof body?.message === 'string' && body.message.trim() ? body.message : error.message;
  } else {
    message = error instanceof Error ? error.message : String(error);
  }
  return message.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…`
    : message;
};

/**
 * Reference data for evaluators is a dataset example's persisted `output` (the
 * ground truth). Only plain objects are usable as `reference_data`; anything else
 * (missing, primitive, array) means "no reference", which is valid for evaluators
 * that don't declare a `referenceDataSchema`. Reference-based evaluators such as
 * `correctness` validate this against their schema and error when it's absent.
 */
export const normalizeReferenceData = (output: unknown): Record<string, unknown> | undefined =>
  typeof output === 'object' && output !== null && !Array.isArray(output)
    ? (output as Record<string, unknown>)
    : undefined;

/**
 * Runs the task, evaluates the trace and ingests scores for a single example
 * across the requested repetitions. Failures on individual repetitions are
 * counted and logged rather than aborting the whole example.
 */
export const runExampleEvaluation = async (
  registry: TaskProviderRegistry,
  runtime: StepRuntime,
  params: EvaluateExampleParams
): Promise<EvaluateExampleResult> => {
  let scoresIngested = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let repetition = 0; repetition < params.repetitions; repetition++) {
    if (runtime.abortSignal.aborted) {
      break;
    }
    try {
      const taskResult = await runTask(
        registry,
        runtime,
        params.target,
        params.example.input ?? {}
      );
      if (!taskResult.traceId) {
        throw new Error(
          'Task did not produce a trace id; trace-based evaluators require a correlating trace'
        );
      }

      const { results: evaluatorResults, errors: evaluatorErrors } = await evaluateTrace(runtime, {
        traceId: taskResult.traceId,
        referenceData: params.referenceData ?? normalizeReferenceData(params.example.output),
        evaluators: params.evaluators,
        instrumentation: { profile: 'elastic-inference' },
      });

      for (const evaluatorError of evaluatorErrors) {
        errors.push(`Example "${params.example.id}" (repetition ${repetition}): ${evaluatorError}`);
      }

      const scoreBody = buildExampleScoreBody({
        experimentId: params.experimentId,
        experimentName: params.experimentName,
        executionId: params.executionId,
        suiteId: params.suiteId,
        taskModel: params.taskModel,
        evaluatorModel: params.evaluatorModel,
        totalRepetitions: params.repetitions,
        example: {
          id: params.example.id,
          index: params.example.index,
          input: params.example.input,
          dataset: params.dataset,
        },
        task: {
          traceId: taskResult.traceId,
          repetitionIndex: repetition,
          output: taskResult.output,
        },
        evaluatorResults,
        spaceIds: params.spaceIds,
      });

      const response = await ingestScores(runtime, scoreBody);
      scoresIngested += response.ingested;
    } catch (error) {
      failed += 1;
      const message = toErrorMessage(error);
      errors.push(`Example "${params.example.id}" (repetition ${repetition}): ${message}`);
      runtime.logger.warn(
        `Failed to evaluate example "${params.example.id}" (repetition ${repetition}): ${message}`
      );
    }
  }

  return { scoresIngested, failed, repetitions: params.repetitions, errors };
};

/** Shared per-example evaluation settings reused across a whole dataset run. */
export interface DatasetEvaluationConfig {
  experimentId: string;
  experimentName?: string;
  executionId?: string;
  suiteId?: string;
  taskModel: Model;
  evaluatorModel: Model;
  target: TaskTarget;
  evaluators: EvaluatorConfig[];
  repetitions: number;
  /** Spaces to assign the scores to; falls back to the workflow space at ingest. */
  spaceIds?: string[];
}

export interface BatchEvaluationResult {
  completed: number;
  failed: number;
  scoresIngested: number;
  errors: string[];
  cancelled?: boolean;
}

/**
 * Evaluates a batch of work items through a bounded worker pool. `completed`
 * counts examples with no failed repetition; `failed` counts examples with at
 * least one failed repetition. This is the reusable unit the poll step drains
 * one batch at a time.
 */
export const evaluateWorkBatch = async (
  registry: TaskProviderRegistry,
  runtime: StepRuntime,
  config: DatasetEvaluationConfig,
  batch: DatasetWorkItem[],
  concurrency: number
): Promise<BatchEvaluationResult> => {
  let completed = 0;
  let failed = 0;
  let scoresIngested = 0;
  let cancelled = false;
  const errors: string[] = [];

  try {
    await mapWithConcurrency(
      batch,
      async ({ dataset, example }) => {
        const result = await runExampleEvaluation(registry, runtime, {
          ...config,
          dataset,
          example,
          // Reference data is derived from each example's persisted `output` inside
          // `runExampleEvaluation`, so reference-based evaluators (e.g. correctness)
          // receive ground truth without a separate per-item override here.
        });
        scoresIngested += result.scoresIngested;
        // Surface every captured message, including partial (evaluator-level) failures on an
        // example that otherwise completed and ingested scores.
        errors.push(...result.errors);
        if (result.failed > 0) {
          failed += 1;
        } else {
          completed += 1;
        }
      },
      { concurrency, signal: runtime.abortSignal }
    );
  } catch (error) {
    if (!(error instanceof ConcurrencyAbortError)) {
      throw error;
    }
    // On cancellation, keep the counts accumulated for examples that finished
    // before the abort (their scores were ingested idempotently) and report a
    // clean cancelled result instead of throwing, so the caller can normalize it.
    cancelled = true;
  }

  return { completed, failed, scoresIngested, errors, cancelled };
};

export interface EvaluateDatasetParams extends DatasetEvaluationConfig {
  datasetIds: string[];
  concurrency: number;
}

export interface EvaluateDatasetResult extends BatchEvaluationResult {
  total: number;
}

/**
 * Resolves the datasets and evaluates every example in a single pooled batch.
 * Used for synchronous (non-workflow) evaluation and tests; the workflow path
 * uses {@link flattenDatasetWork} + {@link evaluateWorkBatch} across poll cycles.
 */
export const runDatasetEvaluation = async (
  registry: TaskProviderRegistry,
  runtime: StepRuntime,
  params: EvaluateDatasetParams
): Promise<EvaluateDatasetResult> => {
  const { datasetIds, concurrency, ...config } = params;
  const datasets = await resolveDatasets(runtime, datasetIds);
  const work = flattenDatasetWork(datasets);
  const batchResult = await evaluateWorkBatch(registry, runtime, config, work, concurrency);
  return { total: work.length, ...batchResult };
};

export const resolveTaskModel = async (
  runtime: StepRuntime,
  providedTaskModel: Model | undefined,
  connectorId: string
): Promise<Model> => {
  if (providedTaskModel && (providedTaskModel.family || providedTaskModel.provider)) {
    return providedTaskModel;
  }
  return runtime.resolveModel(connectorId);
};

/** Derives the default judge model from the evaluator connectors, falling back to the task connector. */
export const resolveEvaluatorModel = async (
  runtime: StepRuntime,
  evaluators: EvaluatorConfig[],
  fallbackConnectorId: string
): Promise<Model> => {
  const judgeConnectorId =
    evaluators.find((evaluator) => evaluator.connector_id)?.connector_id ?? fallbackConnectorId;
  return runtime.resolveModel(judgeConnectorId);
};

export interface PairwiseComparison {
  baseline_id: string;
  comparisons: Array<{
    target_id: string;
    results: CompareExperimentsResponse['results'];
    pairing: CompareExperimentsResponse['pairing'];
  }>;
}

/**
 * Compares a set of experiments against the first (baseline). The compare API is
 * pairwise, so N experiments produce N-1 baseline-vs-target comparisons.
 */
export const compareExperimentsPairwise = async (
  runtime: StepRuntime,
  experimentIds: string[]
): Promise<PairwiseComparison> => {
  const [baselineId, ...targets] = experimentIds;
  const comparisons = await Promise.all(
    targets.map(async (targetId) => {
      const { body } = await runtime.callKibanaApi<CompareExperimentsResponse>({
        method: 'GET',
        path: EVALS_EXPERIMENTS_COMPARE_URL,
        headers: INTERNAL_API_HEADERS,
        query: { type: 'experiment', baseline_id: baselineId, target_id: targetId },
      });
      return { target_id: targetId, results: body.results, pairing: body.pairing };
    })
  );
  return { baseline_id: baselineId, comparisons };
};
