/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { Direction } from '@kbn/evals-common';

/**
 * Shared definitions for the evals workflow steps. Held in `common`
 * so the server handlers and the public editor metadata stay locked together.
 *
 * Step ids live under the `ai.evals.` namespace (grouped beneath the shared `ai.` category
 * prefix alongside steps like `ai.prompt`), and are `tech_preview` while the framework is
 * feature-flagged. The registry enforces global id uniqueness at setup. All input/output
 * keys we own are snake_case per the workflows conventions.
 */

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const recordSchema = z.record(z.string(), z.unknown());

export const modelSchema = z.object({
  id: z.string(),
  family: z.string().optional(),
  provider: z.string().optional(),
});

export const exampleSchema = z.object({
  id: z.string(),
  index: z.number().int().optional(),
  input: recordSchema.optional(),
  output: z.unknown().optional(),
  metadata: recordSchema.nullable().optional(),
});

export const datasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  examples: z.array(exampleSchema),
});

export const evaluatorConfigSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  connector_id: z.string().optional(),
});

export const evaluatorResultSchema = z.object({
  evaluator: z.object({
    name: z.string(),
    version: z.string().optional(),
    kind: z.enum(['llm', 'code']).optional(),
    model: modelSchema.optional(),
    direction: Direction.optional(),
  }),
  scores: z.array(
    z.object({
      name: z.string(),
      score: z.number().nullable().optional(),
      label: z.string().nullable().optional(),
      explanation: z.string().nullable().optional(),
      metadata: recordSchema.optional(),
      trace_id: z.string().nullable().optional(),
    })
  ),
});

/**
 * Spaces the ingested scores are assigned to. When omitted, the ingest step
 * stamps the workflow's execution space.
 */
const spaceIdsSchema = z.array(z.string().min(1)).min(1).optional();

/** Fields that describe "the thing being evaluated" (a task). */
const taskTargetShape = {
  connector_id: z.string(),
  agent_id: z.string().optional(),
  /** Explicit task provider id registered by a suite (overrides inference of the above). */
  task_ref: z.string().optional(),
  /** Free-form parameters passed through to the task provider. */
  params: recordSchema.optional(),
};

const label = (id: string, defaultMessage: string) =>
  i18n.translate(`xpack.evals.workflows.steps.${id}.label`, { defaultMessage });

const description = (id: string, defaultMessage: string) =>
  i18n.translate(`xpack.evals.workflows.steps.${id}.description`, { defaultMessage });

// ---------------------------------------------------------------------------
// Layer 1 — atomic primitives
// ---------------------------------------------------------------------------

export const ResolveDatasetStepId = 'ai.evals.resolveDataset' as const;

export const resolveDatasetInputSchema = z.object({
  dataset_ids: z.array(z.string()).min(1),
});

export const resolveDatasetOutputSchema = z.object({
  datasets: z.array(datasetSchema),
});

export const resolveDatasetCommonDefinition: CommonStepDefinition<
  typeof resolveDatasetInputSchema,
  typeof resolveDatasetOutputSchema
> = {
  id: ResolveDatasetStepId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: label('resolveDataset', 'Resolve evaluation dataset'),
  description: description(
    'resolveDataset',
    'Loads one or more evaluation datasets and their examples so later steps can iterate over them.'
  ),
  inputSchema: resolveDatasetInputSchema,
  outputSchema: resolveDatasetOutputSchema,
};

export const ExecuteTaskStepId = 'ai.evals.executeTask' as const;

export const executeTaskInputSchema = z.object({
  ...taskTargetShape,
  example: exampleSchema,
});

export const executeTaskOutputSchema = z.object({
  output: recordSchema,
  trace_id: z.string().optional(),
});

export const executeTaskCommonDefinition: CommonStepDefinition<
  typeof executeTaskInputSchema,
  typeof executeTaskOutputSchema
> = {
  id: ExecuteTaskStepId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: label('executeTask', 'Execute evaluation task'),
  description: description(
    'executeTask',
    'Runs the feature under evaluation (a direct model call, an Agent Builder agent, or a registered suite task) against a single example.'
  ),
  inputSchema: executeTaskInputSchema,
  outputSchema: executeTaskOutputSchema,
};

export const EvaluateTraceStepId = 'ai.evals.evaluateTrace' as const;

export const evaluateTraceInputSchema = z.object({
  trace_id: z.string(),
  reference_data: recordSchema.optional(),
  evaluators: z.array(evaluatorConfigSchema).min(1),
});

export const evaluateTraceOutputSchema = z.object({
  results: z.array(evaluatorResultSchema),
  errors: z.array(z.string()).optional(),
});

export const evaluateTraceCommonDefinition: CommonStepDefinition<
  typeof evaluateTraceInputSchema,
  typeof evaluateTraceOutputSchema
> = {
  id: EvaluateTraceStepId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: label('evaluateTrace', 'Evaluate trace'),
  description: description(
    'evaluateTrace',
    'Grades a single execution trace with one or more evaluators. This is the shared primitive for both offline and online evaluation.'
  ),
  inputSchema: evaluateTraceInputSchema,
  outputSchema: evaluateTraceOutputSchema,
};

export const IngestScoresStepId = 'ai.evals.ingestScores' as const;

export const ingestScoresInputSchema = z.object({
  experiment_id: z.string(),
  experiment_name: z.string().optional(),
  execution_id: z.string().optional(),
  suite_id: z.string().optional(),
  task_model: modelSchema,
  evaluator_model: modelSchema.optional(),
  total_repetitions: z.number().int().optional(),
  example: z.object({
    id: z.string(),
    index: z.number().int(),
    input: recordSchema.optional(),
    dataset: z.object({ id: z.string(), name: z.string() }),
  }),
  task: z.object({
    trace_id: z.string().optional(),
    repetition_index: z.number().int(),
    output: recordSchema.optional(),
  }),
  evaluator_results: z.array(evaluatorResultSchema),
  space_ids: spaceIdsSchema,
});

export const ingestScoresOutputSchema = z.object({
  ingested: z.number().int(),
  conflicted: z.number().int(),
  failed: z.number().int(),
});

export const ingestScoresCommonDefinition: CommonStepDefinition<
  typeof ingestScoresInputSchema,
  typeof ingestScoresOutputSchema
> = {
  id: IngestScoresStepId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: label('ingestScores', 'Ingest evaluation scores'),
  description: description(
    'ingestScores',
    'Persists evaluator scores for a single example/repetition, fanning each named score into its own document.'
  ),
  inputSchema: ingestScoresInputSchema,
  outputSchema: ingestScoresOutputSchema,
};

// ---------------------------------------------------------------------------
// Layer 2 — composite convenience
// ---------------------------------------------------------------------------

export const EvaluateExampleStepId = 'ai.evals.evaluateExample' as const;

export const evaluateExampleInputSchema = z.object({
  ...taskTargetShape,
  experiment_id: z.string(),
  experiment_name: z.string().optional(),
  execution_id: z.string().optional(),
  suite_id: z.string().optional(),
  task_model: modelSchema.optional(),
  dataset: z.object({ id: z.string(), name: z.string() }),
  example: exampleSchema,
  evaluators: z.array(evaluatorConfigSchema).min(1),
  reference_data: recordSchema.optional(),
  repetitions: z.number().int().min(1).optional(),
  space_ids: spaceIdsSchema,
});

export const evaluateExampleOutputSchema = z.object({
  scores_ingested: z.number().int(),
  failed: z.number().int(),
  repetitions: z.number().int(),
  errors: z.array(z.string()).optional(),
});

export const evaluateExampleCommonDefinition: CommonStepDefinition<
  typeof evaluateExampleInputSchema,
  typeof evaluateExampleOutputSchema
> = {
  id: EvaluateExampleStepId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: label('evaluateExample', 'Evaluate example'),
  description: description(
    'evaluateExample',
    'Runs the task, evaluates the resulting trace, and ingests scores for a single example across the configured repetitions.'
  ),
  inputSchema: evaluateExampleInputSchema,
  outputSchema: evaluateExampleOutputSchema,
};

export const EvaluateDatasetStepId = 'ai.evals.evaluateDataset' as const;

export const evaluateDatasetInputSchema = z.object({
  ...taskTargetShape,
  experiment_id: z.string(),
  experiment_name: z.string().optional(),
  execution_id: z.string().optional(),
  suite_id: z.string().optional(),
  task_model: modelSchema.optional(),
  dataset_ids: z.array(z.string()).min(1),
  evaluators: z.array(evaluatorConfigSchema).min(1),
  repetitions: z.number().int().min(1).optional(),
  /** Max examples evaluated in parallel within this step. */
  concurrency: z.number().int().min(1).optional(),
  space_ids: spaceIdsSchema,
});

export const evaluateDatasetOutputSchema = z.object({
  experiment_id: z.string(),
  example_count: z.number().int(),
  completed: z.number().int(),
  failed: z.number().int(),
  scores_ingested: z.number().int(),
  errors: z.array(z.string()).optional(),
});

export const evaluateDatasetCommonDefinition: CommonStepDefinition<
  typeof evaluateDatasetInputSchema,
  typeof evaluateDatasetOutputSchema
> = {
  id: EvaluateDatasetStepId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: label('evaluateDataset', 'Evaluate dataset'),
  description: description(
    'evaluateDataset',
    'Resolves one or more datasets and evaluates every example with bounded internal concurrency. This is the workhorse step for running an experiment.'
  ),
  inputSchema: evaluateDatasetInputSchema,
  outputSchema: evaluateDatasetOutputSchema,
};

// ---------------------------------------------------------------------------
// Layer 3 — lifecycle
// ---------------------------------------------------------------------------

export const StartExperimentStepId = 'ai.evals.startExperiment' as const;
export const startExperimentInputSchema = z.object({
  task_model: modelSchema,
  suite_id: z.string().optional(),
  experiment_id: z.string().optional(),
  execution_id: z.string().optional(),
});

export const startExperimentOutputSchema = z.object({
  experiment_id: z.string(),
  execution_id: z.string(),
});

export const startExperimentCommonDefinition: CommonStepDefinition<
  typeof startExperimentInputSchema,
  typeof startExperimentOutputSchema
> = {
  id: StartExperimentStepId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: label('startExperiment', 'Start experiment'),
  description: description(
    'startExperiment',
    'Establishes the experiment and execution identifiers that group the scores produced by the run.'
  ),
  inputSchema: startExperimentInputSchema,
  outputSchema: startExperimentOutputSchema,
};

export const CompareExperimentsStepId = 'ai.evals.compareExperiments' as const;

export const compareExperimentsInputSchema = z.object({
  experiment_ids: z.array(z.string()).min(2),
});

export const compareExperimentsOutputSchema = z.object({
  comparison: z.unknown(),
});

export const compareExperimentsCommonDefinition: CommonStepDefinition<
  typeof compareExperimentsInputSchema,
  typeof compareExperimentsOutputSchema
> = {
  id: CompareExperimentsStepId,
  category: StepCategory.Ai,
  stability: 'tech_preview',
  label: label('compareExperiments', 'Compare experiments'),
  description: description(
    'compareExperiments',
    'Runs a statistical comparison across two or more experiments (for example, across models).'
  ),
  inputSchema: compareExperimentsInputSchema,
  outputSchema: compareExperimentsOutputSchema,
};

export const EVALS_STEP_IDS = [
  ResolveDatasetStepId,
  ExecuteTaskStepId,
  EvaluateTraceStepId,
  IngestScoresStepId,
  EvaluateExampleStepId,
  EvaluateDatasetStepId,
  StartExperimentStepId,
  CompareExperimentsStepId,
] as const;
