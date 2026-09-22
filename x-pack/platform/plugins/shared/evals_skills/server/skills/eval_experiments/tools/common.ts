/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import {
  APP_PATH,
  EXPERIMENT_LIMITS,
  MAX_ID_LENGTH,
  MAX_NAME_LENGTH,
} from '@kbn/evals-plugin/common';
import type { GenerateExperimentParams, GeneratedExperimentRun } from '@kbn/evals-plugin/server';

export const EVALS_TOOLS_NAMESPACE = 'platform.evals';

const evalsTool = (name: string) => `${EVALS_TOOLS_NAMESPACE}.${name}`;

export const evalsTools = {
  listDatasets: evalsTool('list_datasets'),
  listEvaluators: evalsTool('list_evaluators'),
  listTargets: evalsTool('list_targets'),
  listConnectors: evalsTool('list_connectors'),
  previewExperiment: evalsTool('preview_experiment'),
  saveExperiment: evalsTool('save_experiment'),
  runExperiment: evalsTool('run_experiment'),
} as const;

/**
 * A configuration error caused by invalid tool input. Surfaced back to the agent
 * as a friendly error result rather than an unhandled exception.
 */
export class EvalExperimentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvalExperimentConfigError';
  }
}

export const evaluatorInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(MAX_NAME_LENGTH)
    .describe('Evaluator name, as returned by list_evaluators.'),
  version: z
    .string()
    .max(MAX_NAME_LENGTH)
    .optional()
    .describe('Optional evaluator version. Defaults to the latest registered version.'),
  connector_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      'Judge model connector id. REQUIRED for `llm` evaluators (needsJudgeConnector=true); omit for `code` evaluators. Ask the user to pick it from list_connectors; do not guess or default to the first one.'
    ),
});

/**
 * The shared "experiment configuration" accepted by the preview/save/run tools.
 * Mirrors the evals "new experiment" form. The workflow topology (single,
 * dataset fan-out, or cross-model) is inferred by the generator from these inputs.
 */
export const evalExperimentConfigSchema = z
  .object({
    name: z
      .string()
      .max(MAX_NAME_LENGTH)
      .optional()
      .describe(
        'Human-readable experiment name. A default is derived from the target when omitted.'
      ),
    target: z
      .enum(['inference', 'agent'])
      .describe(
        'What is being evaluated: `inference` invokes the model connector(s) directly, `agent` runs an Agent Builder agent via converse. Ask the user which one they mean; do not assume.'
      ),
    connector_ids: z
      .array(z.string().min(1).max(MAX_ID_LENGTH))
      .min(1)
      .max(EXPERIMENT_LIMITS.maxConnectorIds)
      .describe(
        'Model connector id(s) under evaluation, resolved from list_connectors. Providing two or more triggers a cross-model comparison. Do not guess or default these — ask the user if unspecified.'
      ),
    agent_id: z
      .string()
      .max(MAX_ID_LENGTH)
      .optional()
      .describe(
        'Agent Builder agent id to evaluate. Required when `target` is `agent`; omit it entirely when `target` is `inference`.'
      ),
    dataset_ids: z
      .array(z.string().min(1).max(MAX_ID_LENGTH))
      .min(1)
      .max(EXPERIMENT_LIMITS.maxDatasetIds)
      .describe('Dataset id(s) to evaluate against, as returned by list_eval_datasets.'),
    evaluators: z
      .array(evaluatorInputSchema)
      .min(1)
      .max(EXPERIMENT_LIMITS.maxEvaluators)
      .describe('Evaluators used to score each example.'),
    repetitions: z
      .number()
      .int()
      .min(1)
      .max(EXPERIMENT_LIMITS.maxRepetitions)
      .optional()
      .describe('How many times to run each example. Defaults to 1.'),
    concurrency: z
      .number()
      .int()
      .min(1)
      .max(EXPERIMENT_LIMITS.maxConcurrency)
      .optional()
      .describe('Maximum number of examples evaluated in parallel. Defaults to 5.'),
    compare: z
      .boolean()
      .optional()
      .describe(
        'Only for saved cross-model workflows: append an ai.evals.compareExperiments step after the per-model runs.'
      ),
  })
  .refine((config) => config.target !== 'agent' || !!config.agent_id, {
    message: 'agent_id is required when target is `agent`. Ask the user which agent to evaluate.',
    path: ['agent_id'],
  })
  .refine((config) => config.target !== 'inference' || !config.agent_id, {
    message:
      'agent_id must be omitted when target is `inference`. Set target to `agent` to evaluate an Agent Builder agent.',
    path: ['agent_id'],
  });

export type EvalExperimentConfig = z.infer<typeof evalExperimentConfigSchema>;

/**
 * Validates an experiment configuration and maps it to the (camelCase) generator
 * params. Throws {@link EvalExperimentConfigError} with a user-friendly message
 * for invalid combinations.
 */
export const toGenerateParams = (config: EvalExperimentConfig): GenerateExperimentParams => {
  if (config.target === 'agent' && !config.agent_id) {
    throw new EvalExperimentConfigError(
      'Provide an agent_id to evaluate an Agent Builder agent, or set target to `inference` to evaluate the model connector directly.'
    );
  }

  // Scores are always written to the caller's active space (defaulted at ingest time). Cross-space
  // targeting is intentionally not exposed here; it stays in the space-authorized UI/API paths.
  return {
    name: config.name,
    connectorIds: config.connector_ids,
    // Omitted for `inference`, which is how the generator and `resolveTaskProviderName` select the
    // direct-inference task provider.
    agentId: config.target === 'agent' ? config.agent_id : undefined,
    datasetIds: config.dataset_ids,
    evaluators: config.evaluators,
    repetitions: config.repetitions,
    concurrency: config.concurrency,
    compare: config.compare,
  };
};

/**
 * Builds a deep link to the experiment results, mirroring the evals UI: cross-model
 * (fanned-out) runs land on the run overview, single/shard runs on the experiment
 * detail page.
 */
export const buildResultsLink = (
  serverBasePath: string,
  spaceId: string,
  run: GeneratedExperimentRun,
  workflowExecutionIds: string[]
): string => {
  const spaceSegment = spaceId && spaceId !== DEFAULT_SPACE_ID ? `/s/${spaceId}` : '';
  const appBase = `${serverBasePath}${spaceSegment}${APP_PATH}`;

  if (run.mode === 'cross-model') {
    const params = new URLSearchParams();
    for (const execution of run.executions) {
      params.append('execution_id', execution.executionId);
      params.append('connector', execution.connectorId);
    }
    for (const workflowExecutionId of workflowExecutionIds) {
      params.append('workflow_execution_id', workflowExecutionId);
    }
    return `${appBase}/runs?${params.toString()}`;
  }

  const detailPathId = run.experimentIds[0] ?? run.executionId;
  const params = new URLSearchParams({ execution_id: run.executionId });
  for (const workflowExecutionId of workflowExecutionIds) {
    params.append('workflow_execution_id', workflowExecutionId);
  }
  return `${appBase}/experiments/${encodeURIComponent(detailPathId)}?${params.toString()}`;
};

/** Builds a deep link to a saved workflow's detail page in the Workflows app. */
export const buildWorkflowLink = (
  serverBasePath: string,
  spaceId: string,
  workflowId: string
): string => {
  const spaceSegment = spaceId && spaceId !== DEFAULT_SPACE_ID ? `/s/${spaceId}` : '';
  return `${serverBasePath}${spaceSegment}/app/workflows/${encodeURIComponent(workflowId)}`;
};

export const otherResult = (data: Record<string, unknown>): ToolHandlerStandardReturn => ({
  results: [{ type: ToolResultType.other, tool_result_id: getToolResultId(), data }],
});

export const errorResult = (
  message: string,
  metadata?: Record<string, unknown>
): ToolHandlerStandardReturn => ({
  results: [
    {
      type: ToolResultType.error,
      tool_result_id: getToolResultId(),
      data: { message, ...(metadata ? { metadata } : {}) },
    },
  ],
});

/**
 * Normalizes an unknown thrown value into a friendly error result. Config errors
 * keep their message verbatim; unexpected errors get a generic prefix.
 */
export const toErrorResult = (
  error: unknown,
  genericPrefix: string,
  metadata?: Record<string, unknown>
): ToolHandlerStandardReturn => {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof EvalExperimentConfigError) {
    return errorResult(message, metadata);
  }
  return errorResult(`${genericPrefix}: ${message}`, metadata);
};
