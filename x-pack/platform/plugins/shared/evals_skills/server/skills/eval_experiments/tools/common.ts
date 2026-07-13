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
import { APP_PATH } from '@kbn/evals-plugin/common';
import type { GenerateExperimentParams, GeneratedExperimentRun } from '@kbn/evals-plugin/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';

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
  name: z.string().min(1).describe('Evaluator name, as returned by list_evaluators.'),
  version: z
    .string()
    .optional()
    .describe('Optional evaluator version. Defaults to the latest registered version.'),
  connector_id: z
    .string()
    .optional()
    .describe(
      'Judge model connector id. REQUIRED for `llm` evaluators (needsJudgeConnector=true); omit for `code` evaluators.'
    ),
});

/**
 * The shared "experiment configuration" accepted by the preview/save/run tools.
 * Mirrors the evals "new experiment" form. The workflow topology (single,
 * dataset fan-out, or cross-model) is inferred by the generator from these inputs.
 */
export const evalExperimentConfigSchema = z.object({
  name: z
    .string()
    .optional()
    .describe('Human-readable experiment name. A default is derived from the target when omitted.'),
  connector_ids: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      'Model connector id(s) under evaluation. Providing two or more triggers a cross-model comparison.'
    ),
  agent_id: z
    .string()
    .optional()
    .describe('Agent Builder agent id to evaluate. Mutually exclusive with tool_id.'),
  tool_id: z
    .string()
    .optional()
    .describe('Agent Builder tool id to evaluate. Mutually exclusive with agent_id.'),
  dataset_ids: z
    .array(z.string().min(1))
    .min(1)
    .describe('Dataset id(s) to evaluate against, as returned by list_eval_datasets.'),
  evaluators: z
    .array(evaluatorInputSchema)
    .min(1)
    .describe('Evaluators used to score each example.'),
  repetitions: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('How many times to run each example. Defaults to 1.'),
  concurrency: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Maximum number of examples evaluated in parallel. Defaults to 5.'),
  compare: z
    .boolean()
    .optional()
    .describe(
      'Only for saved cross-model workflows: append an evals.compareExperiments step after the per-model runs.'
    ),
  space_ids: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe(
      'Spaces the resulting scores are visible in. Defaults to the current space when omitted.'
    ),
});

export type EvalExperimentConfig = z.infer<typeof evalExperimentConfigSchema>;

/**
 * Validates an experiment configuration and maps it to the (camelCase) generator
 * params. Throws {@link EvalExperimentConfigError} with a user-friendly message
 * for invalid combinations.
 */
export const toGenerateParams = (config: EvalExperimentConfig): GenerateExperimentParams => {
  if (config.agent_id && config.tool_id) {
    throw new EvalExperimentConfigError('Provide only one of agent_id or tool_id, not both.');
  }
  if (!config.agent_id && !config.tool_id) {
    throw new EvalExperimentConfigError(
      'Provide either an agent_id or a tool_id to identify what to evaluate.'
    );
  }
  if (config.space_ids?.includes(ALL_SPACES_ID)) {
    throw new EvalExperimentConfigError(
      `Assigning an experiment to all spaces ("${ALL_SPACES_ID}") is not supported yet; provide explicit space ids.`
    );
  }

  return {
    name: config.name,
    connectorIds: config.connector_ids,
    agentId: config.agent_id,
    toolId: config.tool_id,
    datasetIds: config.dataset_ids,
    evaluators: config.evaluators,
    repetitions: config.repetitions,
    concurrency: config.concurrency,
    compare: config.compare,
    spaceIds: config.space_ids,
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

  if (run.executions.length > 1) {
    const params = new URLSearchParams({
      execution_id: run.executions.map((execution) => execution.executionId).join(','),
      connector: run.executions.map((execution) => execution.connectorId).join(','),
    });
    if (workflowExecutionIds.length > 0) {
      params.set('workflow_execution_id', workflowExecutionIds.join(','));
    }
    return `${appBase}/runs?${params.toString()}`;
  }

  const detailPathId = run.experimentIds[0] ?? run.executionId;
  const params = new URLSearchParams({ execution_id: run.executionId });
  if (workflowExecutionIds.length > 0) {
    params.set('workflow_execution_id', workflowExecutionIds.join(','));
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
