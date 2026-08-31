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
  ExperimentEvaluatorInfo,
  ExperimentExecutionRecord,
  ExperimentProtocolDataset,
  GetEvaluationExperimentProtocolResponse,
  Model,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { Logger } from '@kbn/logging';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { DatasetClient } from '../../storage/datasets/dataset_client';
import type { ExperimentRecordDocument } from '../../storage/experiments/experiment_record_client';
import type { ExperimentRecordService } from '../../storage/experiments/experiment_record_service';
import type { RouteDependencies } from '../register_routes';
import type { EvalsWorkflowsManagementSetup } from '../../types';
import type { EvalDocSource } from './types';
import { isEvalsExperimentExecution } from './experiment_executions';

type DerivedStatus = ExperimentExecutionRecord['status'];
type StatusResolution = Pick<ExperimentExecutionRecord, 'status' | 'status_source'>;

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

const isTerminalRecordStatus = (status: ExperimentRecordDocument['status']): boolean =>
  status === 'completed' || status === 'failed';

/**
 * Reads the stored experiment record, treating a failed lookup as "no record"
 * so the endpoint can still answer from score derivation.
 */
const lookupExperimentRecord = async ({
  experimentRecordService,
  experimentId,
  spaceId,
  logger,
}: {
  experimentRecordService: ExperimentRecordService;
  experimentId: string;
  spaceId: string;
  logger: Logger;
}): Promise<ExperimentRecordDocument | undefined> => {
  try {
    return await experimentRecordService.getClient({ spaceId }).get(experimentId);
  } catch (error) {
    logger.warn(
      `Failed to read experiment record for ${experimentId}; deriving from scores: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};

const resolveExecutionStatus = async ({
  record,
  workflowExecutionId,
  workflowsManagement,
  spaceId,
  logger,
}: {
  record: ExperimentRecordDocument | undefined;
  workflowExecutionId: string | undefined;
  workflowsManagement: EvalsWorkflowsManagementSetup | undefined;
  spaceId: string;
  logger: Logger;
}): Promise<StatusResolution> => {
  if (record && isTerminalRecordStatus(record.status)) {
    return { status: record.status, status_source: 'record' };
  }

  // A missing or still-running record defers to the live workflow state.
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
        `Workflow execution ${workflowExecutionId} not found or not an evals experiment execution; deriving status from the record or scores`
      );
    } catch (error) {
      logger.warn(
        `Failed to fetch workflow execution ${workflowExecutionId}; deriving status from the record or scores: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (record) {
    return { status: record.status, status_source: 'record' };
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

/**
 * Ensures the dataset snapshotted on the record shows up even before any of
 * its scores exist.
 */
const includeRecordDataset = (
  derived: ExperimentProtocolDataset[],
  record: ExperimentRecordDocument | undefined
): ExperimentProtocolDataset[] => {
  const snapshot = record?.protocol.dataset;
  if (!snapshot || derived.some((dataset) => dataset.id === snapshot.id)) {
    return derived;
  }
  return [
    ...derived,
    { id: snapshot.id, name: snapshot.name ?? snapshot.id, evaluated_example_count: 0 },
  ];
};

const applyDatasetSnapshot = (
  datasets: ExperimentDatasetInfo[],
  record: ExperimentRecordDocument | undefined
): ExperimentDatasetInfo[] => {
  const snapshot = record?.protocol.dataset;
  if (!snapshot) {
    return datasets;
  }
  return datasets.map((dataset) => {
    if (dataset.id !== snapshot.id || dataset.exists) {
      return dataset;
    }
    return {
      ...dataset,
      ...(snapshot.description !== undefined && { description: snapshot.description }),
      ...(snapshot.examples_count !== undefined && { example_count: snapshot.examples_count }),
    };
  });
};

const toResponseModel = (model: Model): Model => ({
  id: buildModelDisplayId(model.id, model.family, model.provider),
  family: model.family,
  provider: model.provider,
});

const mergeEvaluators = (
  derived: ExperimentEvaluatorInfo[],
  record: ExperimentRecordDocument | undefined
): ExperimentEvaluatorInfo[] => {
  const snapshots = record?.protocol.evaluators ?? [];
  if (snapshots.length === 0) {
    return derived;
  }

  const snapshotsByName = new Map(snapshots.map((snapshot) => [snapshot.name, snapshot]));

  const merged = derived.map((evaluator) => {
    const snapshot = snapshotsByName.get(evaluator.name);
    if (!snapshot) {
      return evaluator;
    }
    const kind = snapshot.kind ?? evaluator.kind;
    const model =
      kind === 'code'
        ? undefined
        : snapshot.model
        ? toResponseModel(snapshot.model)
        : evaluator.model;
    return {
      name: evaluator.name,
      version: snapshot.version ?? evaluator.version,
      ...(kind && { kind }),
      ...(model && { model }),
      score_count: evaluator.score_count,
    };
  });

  const derivedNames = new Set(derived.map((evaluator) => evaluator.name));
  for (const snapshot of snapshots) {
    if (derivedNames.has(snapshot.name)) {
      continue;
    }
    merged.push({
      name: snapshot.name,
      ...(snapshot.version && { version: snapshot.version }),
      ...(snapshot.kind && { kind: snapshot.kind }),
      ...(snapshot.kind !== 'code' && snapshot.model && { model: toResponseModel(snapshot.model) }),
      score_count: 0,
    });
  }

  return merged;
};

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

          const [searchResponse, record] = await Promise.all([
            evalsContext.evaluationScoreService.search({
              query,
              size: 1,
              track_total_hits: true,
              aggs: buildProtocolAggregation(),
            }),
            // The record describes a single experiment; an execution_id
            // override may span several, so it is not consulted.
            executionId
              ? undefined
              : lookupExperimentRecord({
                  experimentRecordService: evalsContext.experimentRecordService,
                  experimentId,
                  spaceId,
                  logger,
                }),
          ]);

          const firstDoc = searchResponse.hits?.hits[0]?._source as EvalDocSource | undefined;
          if (!firstDoc && !record) {
            const notFoundId = executionId ?? experimentId;
            const notFoundLabel = executionId ? 'execution' : 'experiment';
            return response.notFound({
              body: { message: `Experiment not found for ${notFoundLabel}: ${notFoundId}` },
            });
          }

          const aggregates = parseProtocolAggregationResponse(
            searchResponse.aggregations as Record<string, unknown> | undefined
          );

          const totalHits = searchResponse.hits?.total;
          const receivedScores = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;

          const [datasets, { status, status_source: statusSource }] = await Promise.all([
            enrichDatasets(
              includeRecordDataset(aggregates.datasets, record),
              evalsContext.datasetService.getClient({ spaceId })
            ),
            resolveExecutionStatus({
              record,
              workflowExecutionId,
              workflowsManagement,
              spaceId,
              logger,
            }),
          ]);

          const taskModel = record?.protocol.task?.model ?? firstDoc?.task?.model;
          // Completeness stays purely score-derived even when a record exists:
          // it reports what the scores show, while task_counters carries the
          // record's own accounting.
          const expectedScores =
            aggregates.example_count * aggregates.total_repetitions * aggregates.evaluators.length;

          const provenance = record?.provenance;

          const body: GetEvaluationExperimentProtocolResponse = {
            experiment_id: experimentId,
            protocol: {
              experiment_name: record?.name ?? firstDoc?.experiment_name ?? null,
              ...(taskModel && {
                task_model: {
                  id: buildModelDisplayId(taskModel.id, taskModel.family, taskModel.provider),
                  family: taskModel.family,
                  provider: taskModel.provider,
                },
              }),
              total_repetitions: record?.protocol.total_repetitions ?? aggregates.total_repetitions,
              datasets: applyDatasetSnapshot(datasets, record),
              evaluators: mergeEvaluators(aggregates.evaluators, record),
            },
            execution: {
              execution_id: firstDoc?.metadata?.execution_id ?? provenance?.execution_id,
              suite_id: firstDoc?.metadata?.suite_id ?? provenance?.suite_id ?? null,
              first_score_at: aggregates.first_score_at,
              last_score_at: aggregates.last_score_at,
              git_branch: firstDoc?.metadata?.git?.branch ?? provenance?.git?.branch ?? null,
              git_commit_sha:
                firstDoc?.metadata?.git?.commit_sha ?? provenance?.git?.commit_sha ?? null,
              ci: firstDoc?.metadata?.ci ?? provenance?.ci,
              hostname: firstDoc?.metadata?.hostname ?? provenance?.hostname,
              ...(record?.started_at && { started_at: record.started_at }),
              ...(record?.completed_at && { completed_at: record.completed_at }),
              ...(record?.error !== undefined && { error: record.error }),
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
              ...(record?.completeness && { task_counters: record.completeness }),
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
