/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EXPERIMENT_EXECUTION_URL,
  EVALS_EXPERIMENT_EXECUTION_CANCEL_URL,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { z } from '@kbn/zod/v4';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { EVALS_API_PRIVILEGES } from '../../../common';
import {
  EVALS_EXPERIMENT_WORKFLOW_TAG,
  MAX_ID_LENGTH,
} from '../../../common/experiments/run_experiment';
import type {
  ExperimentExecutionStatus,
  ExperimentStepProgress,
} from '../../../common/experiments/run_experiment';
import type { RouteDependencies } from '../register_routes';

const executionParamsSchema = z.object({ workflowExecutionId: z.string().max(MAX_ID_LENGTH) });

const WORKFLOWS_UNAVAILABLE = {
  statusCode: 501 as const,
  body: {
    message:
      'The Workflows plugin is not available. Experiment execution is disabled in this deployment.',
  },
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const asStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    ? (value as string[])
    : undefined;

/**
 * Extracts dataset progress, preferring final output over live durable state.
 * Raw state counters are pre-batch snapshots and may be stale.
 */
export const extractProgress = (
  step: Pick<WorkflowStepExecutionDto, 'output' | 'state'>
): ExperimentStepProgress | undefined => {
  const output = asRecord(step.output);
  const customState = asRecord(asRecord(step.state?.__durableStepState)?.customState);

  const total =
    asNumber(output?.example_count) ??
    (Array.isArray(customState?.work) ? customState?.work.length : undefined);

  const errors = asStringArray(output?.errors) ?? asStringArray(customState?.errors);

  const progress: ExperimentStepProgress = {
    total,
    completed: asNumber(output?.completed) ?? asNumber(customState?.completed),
    failed: asNumber(output?.failed) ?? asNumber(customState?.failed),
    scores_ingested: asNumber(output?.scores_ingested) ?? asNumber(customState?.scores_ingested),
    errors: errors && errors.length > 0 ? errors : undefined,
  };
  const hasAny = Object.values(progress).some((value) => value !== undefined);
  return hasAny ? progress : undefined;
};

const toExecutionStatus = (dto: WorkflowExecutionDto): ExperimentExecutionStatus => ({
  id: dto.id,
  status: dto.status,
  error: dto.error?.message,
  started_at: dto.startedAt,
  finished_at: dto.finishedAt,
  steps: dto.stepExecutions.map((step) => ({
    step_id: step.stepId,
    step_type: step.stepType,
    status: step.status,
    error: step.error?.message,
    progress: extractProgress(step),
  })),
});

export const isEvalsExperimentExecution = (
  dto: Pick<WorkflowExecutionDto, 'workflowDefinition'>
): boolean => Boolean(dto.workflowDefinition?.tags?.includes(EVALS_EXPERIMENT_WORKFLOW_TAG));

/** Polls the status of a launched experiment workflow execution (progress + per-step state). */
export const registerGetExperimentExecutionRoute = ({
  router,
  logger,
  workflowsManagement,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_EXECUTION_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get the status of an experiment workflow execution',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: { params: buildRouteValidationWithZod(executionParamsSchema) } },
      },
      async (context, request, response) => {
        if (!workflowsManagement) {
          return response.customError(WORKFLOWS_UNAVAILABLE);
        }

        const { workflowExecutionId } = request.params;
        const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

        try {
          const dto = await workflowsManagement.management.getWorkflowExecution(
            workflowExecutionId,
            spaceId,
            // The step `output` holds the authoritative final counters
            // (example_count/completed/failed/scores_ingested); it is excluded by
            // default, so opt in for accurate run progress.
            { includeOutput: true }
          );
          if (!dto || !isEvalsExperimentExecution(dto)) {
            return response.notFound({
              body: { message: `Workflow execution not found: ${workflowExecutionId}` },
            });
          }
          return response.ok({ body: toExecutionStatus(dto) });
        } catch (error) {
          logger.error(
            `Failed to fetch workflow execution ${workflowExecutionId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to fetch workflow execution status' },
          });
        }
      }
    );
};

/** Cancels a running experiment workflow execution (aborts in-flight inference via the poll step). */
export const registerCancelExperimentExecutionRoute = ({
  router,
  logger,
  workflowsManagement,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EXPERIMENT_EXECUTION_CANCEL_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Cancel an experiment workflow execution',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: { params: buildRouteValidationWithZod(executionParamsSchema) } },
      },
      async (context, request, response) => {
        if (!workflowsManagement) {
          return response.customError(WORKFLOWS_UNAVAILABLE);
        }

        const { workflowExecutionId } = request.params;
        const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

        try {
          // Verify the target is an evals experiment before cancelling so evals `manage`
          // cannot abort unrelated workflow executions in the space (fail-closed).
          const dto = await workflowsManagement.management.getWorkflowExecution(
            workflowExecutionId,
            spaceId
          );
          if (!dto || !isEvalsExperimentExecution(dto)) {
            return response.notFound({
              body: { message: `Workflow execution not found: ${workflowExecutionId}` },
            });
          }
          await workflowsManagement.management.cancelWorkflowExecution(
            workflowExecutionId,
            spaceId,
            request
          );
          return response.ok({ body: { cancelled: true } });
        } catch (error) {
          logger.error(
            `Failed to cancel workflow execution ${workflowExecutionId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to cancel workflow execution' },
          });
        }
      }
    );
};
