/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXPERIMENT_PROTOCOL_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  buildExperimentFilterQuery,
  buildProtocolAggregation,
  parseProtocolAggregationResponse,
  buildModelDisplayId,
  GetEvaluationExperimentProtocolRequestParams,
  GetEvaluationExperimentProtocolRequestQuery,
} from '@kbn/evals-common';
import type {
  ExperimentDatasetInfo,
  ExperimentExecutionRecord,
  ExperimentProtocolDataset,
  GetEvaluationExperimentProtocolResponse,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { Logger } from '@kbn/logging';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { DatasetClient } from '../../storage/datasets/dataset_client';
import type { RouteDependencies } from '../register_routes';
import type { EvalsWorkflowsManagementSetup } from '../../types';
import type { EvalDocSource } from './types';
import { isEvalsExperimentExecution } from './experiment_executions';

type DerivedStatus = ExperimentExecutionRecord['status'];

const WORKFLOW_STATUS_TO_DERIVED_STATUS: Record<WorkflowExecutionDto['status'], DerivedStatus> = {
  pending: 'pending',
  waiting: 'pending',
  waiting_for_input: 'pending',
  waiting_for_child: 'pending',
  queued: 'pending',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  timed_out: 'failed',
  cancelled: 'cancelled',
  skipped: 'failed',
};

const deriveExecutionStatus = async ({
  workflowExecutionId,
  workflowsManagement,
  spaceId,
  logger,
}: {
  workflowExecutionId: string | undefined;
  workflowsManagement: EvalsWorkflowsManagementSetup | undefined;
  spaceId: string;
  logger: Logger;
}): Promise<Pick<ExperimentExecutionRecord, 'status' | 'status_source'>> => {
  if (workflowExecutionId && workflowsManagement) {
    try {
      const dto = await workflowsManagement.management.getWorkflowExecution(
        workflowExecutionId,
        spaceId
      );
      if (dto && isEvalsExperimentExecution(dto)) {
        return {
          status: WORKFLOW_STATUS_TO_DERIVED_STATUS[dto.status] ?? 'running',
          status_source: 'workflow',
        };
      }
      logger.warn(
        `Workflow execution ${workflowExecutionId} not found or not an evals experiment execution; deriving status from scores`
      );
    } catch (error) {
      logger.warn(
        `Failed to fetch workflow execution ${workflowExecutionId}; deriving status from scores: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  return { status: 'completed', status_source: 'scores' };
};

const enrichDatasets = async (
  datasets: ExperimentProtocolDataset[],
  datasetClient: DatasetClient
): Promise<ExperimentDatasetInfo[]> =>
  Promise.all(
    datasets.map(async (dataset) => {
      const stored = await datasetClient.getMetadata(dataset.id);
      if (!stored) {
        return { ...dataset, exists: false };
      }
      return {
        ...dataset,
        exists: true,
        description: stored.description,
        example_count: stored.examples_count,
      };
    })
  );

export const registerGetExperimentProtocolRoute = ({
  router,
  logger,
  workflowsManagement,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_PROTOCOL_URL,
      access: INTERNAL_API_ACCESS,
      enableQueryVersion: true,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get evaluation experiment protocol and execution record',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEvaluationExperimentProtocolRequestParams),
            query: buildRouteValidationWithZod(GetEvaluationExperimentProtocolRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { experimentId } = request.params;
          const {
            suite_id: suiteId,
            model_id: modelId,
            execution_id: executionId,
            workflow_execution_id: workflowExecutionId,
          } = request.query;
          const evalsContext = await context.evals;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const filterId = executionId ?? experimentId;
          const filterField = executionId ? 'metadata.execution_id' : 'experiment_id';
          const query = buildExperimentFilterQuery(filterId, {
            suiteId,
            modelId,
            filterField,
            spaceId,
          });

          const searchResponse = await evalsContext.evaluationScoreService.search({
            query,
            size: 1,
            track_total_hits: true,
            aggs: buildProtocolAggregation(),
          });

          const firstDoc = searchResponse.hits?.hits[0]?._source as EvalDocSource | undefined;
          if (!firstDoc) {
            return response.notFound({
              body: { message: `Experiment not found: ${experimentId}` },
            });
          }

          const aggregates = parseProtocolAggregationResponse(
            searchResponse.aggregations as Record<string, unknown> | undefined
          );

          const totalHits = searchResponse.hits?.total;
          const receivedScores = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;

          const [datasets, { status, status_source: statusSource }] = await Promise.all([
            enrichDatasets(aggregates.datasets, evalsContext.datasetService.getClient({ spaceId })),
            deriveExecutionStatus({ workflowExecutionId, workflowsManagement, spaceId, logger }),
          ]);

          const taskModel = firstDoc.task?.model;
          const expectedScores =
            aggregates.example_count * aggregates.total_repetitions * aggregates.evaluators.length;

          const body: GetEvaluationExperimentProtocolResponse = {
            experiment_id: experimentId,
            protocol: {
              experiment_name: firstDoc.experiment_name ?? null,
              ...(taskModel && {
                task_model: {
                  id: buildModelDisplayId(taskModel.id, taskModel.family, taskModel.provider),
                  family: taskModel.family,
                  provider: taskModel.provider,
                },
              }),
              total_repetitions: aggregates.total_repetitions,
              datasets,
              evaluators: aggregates.evaluators,
            },
            execution: {
              execution_id: firstDoc.metadata?.execution_id,
              suite_id: firstDoc.metadata?.suite_id ?? null,
              first_score_at: aggregates.first_score_at,
              last_score_at: aggregates.last_score_at,
              git_branch: firstDoc.metadata?.git?.branch ?? null,
              git_commit_sha: firstDoc.metadata?.git?.commit_sha ?? null,
              ci: firstDoc.metadata?.ci,
              hostname: firstDoc.metadata?.hostname,
              status,
              status_source: statusSource,
              completeness: {
                example_count: aggregates.example_count,
                evaluator_count: aggregates.evaluators.length,
                total_repetitions: aggregates.total_repetitions,
                expected_scores: expectedScores,
                received_scores: receivedScores,
                complete: expectedScores > 0 && receivedScores >= expectedScores,
              },
            },
          };

          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to get evaluation experiment protocol: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get evaluation experiment protocol' },
          });
        }
      }
    );
};
