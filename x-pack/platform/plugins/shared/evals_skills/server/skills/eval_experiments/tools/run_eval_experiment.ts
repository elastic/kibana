/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core/server';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { MAX_ID_LENGTH } from '@kbn/evals-plugin/common';
import { generateExperimentRun } from '@kbn/evals-plugin/server';
import {
  buildResultsLink,
  errorResult,
  evalExperimentConfigSchema,
  evalsTools,
  otherResult,
  toErrorResult,
  toGenerateParams,
} from './common';
import { hasManageEvalsPrivilege } from './check_privileges';
import type { EvalExperimentsToolDeps } from './deps';

const cancelLaunchedExecutions = async (
  { workflowsApi, logger }: EvalExperimentsToolDeps,
  workflowExecutionIds: string[],
  spaceId: string,
  request: KibanaRequest
): Promise<void> => {
  const cancellations = await Promise.allSettled(
    workflowExecutionIds.map((workflowExecutionId) =>
      workflowsApi.cancelWorkflowExecution(workflowExecutionId, spaceId, request)
    )
  );

  cancellations.forEach((cancellation, index) => {
    if (cancellation.status === 'rejected') {
      logger.error(
        `Failed to cancel orphaned experiment workflow execution ${workflowExecutionIds[index]}: ${
          cancellation.reason instanceof Error
            ? cancellation.reason.message
            : String(cancellation.reason)
        }`
      );
    }
  });
};

const runSchema = evalExperimentConfigSchema.extend({
  workflow_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('Optional saved workflow id to associate this run with (for correlation in the UI).'),
});

/**
 * Runs an experiment immediately by launching one or more workflow executions
 * (fan-out for large / cross-model runs). Guarded by a per-call user confirmation
 * because it performs real model calls and ingests scores.
 */
export const runEvalExperimentTool = (
  deps: EvalExperimentsToolDeps
): BuiltinSkillBoundedTool<typeof runSchema> => ({
  id: evalsTools.runExperiment,
  type: ToolType.builtin,
  description:
    'Run an evaluation experiment now. Launches one or more workflow executions (without waiting for completion) and returns the execution ids plus a link to the live results. Prefer preview_eval_experiment first so the user can review the configuration.',
  schema: runSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => {
      const target = toolParams.agent_id
        ? `agent "${toolParams.agent_id}"`
        : 'the configured target';
      const models = toolParams.connector_ids.join(', ');
      const datasetCount = toolParams.dataset_ids.length;
      return {
        title: 'Run evaluation experiment?',
        message: `This launches a real evaluation of ${target} across ${datasetCount} dataset(s) using model(s): ${models}. It executes workflow run(s) that call the model/connectors and ingest scores.`,
        confirm_text: 'Run experiment',
        cancel_text: 'Cancel',
      };
    },
  },
  handler: async ({ workflow_id: workflowId, ...config }, { request, spaceId }) => {
    const workflowExecutionIds: string[] = [];
    try {
      const { security } = await deps.getStartDependencies();
      if (!(await hasManageEvalsPrivilege({ security, request, spaceId }))) {
        return errorResult(
          'You do not have the manage_evals privilege required to run evaluation experiments in this space.'
        );
      }

      const params = toGenerateParams(config);
      const run = generateExperimentRun(params);

      for (const execution of run.executions) {
        const result = await deps.workflowsApi.executeWorkflow({
          yaml: execution.yaml,
          ...(workflowId ? { workflowId } : {}),
          request,
          spaceId,
          waitForCompletion: false,
          triggeredBy: 'evals-skill-run',
          metadata: { execution_id: execution.executionId },
        });
        workflowExecutionIds.push(result.workflowExecutionId);
      }

      return otherResult({
        mode: run.mode,
        compare_by: run.compareBy,
        execution_id: run.executionId,
        experiment_ids: run.experimentIds,
        workflow_execution_ids: workflowExecutionIds,
        executions: run.executions.map((execution, index) => ({
          execution_id: execution.executionId,
          connector_id: execution.connectorId,
          workflow_execution_id: workflowExecutionIds[index],
        })),
        results_url: buildResultsLink(deps.serverBasePath, spaceId, run, workflowExecutionIds),
      });
    } catch (error) {
      await cancelLaunchedExecutions(deps, workflowExecutionIds, spaceId, request);
      return toErrorResult(error, 'Failed to run experiment');
    }
  },
});
