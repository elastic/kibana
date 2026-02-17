/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import { Streams, type DashboardSuggestionResult } from '@kbn/streams-schema';
import {
  suggestDashboard,
  prepareDashboardSuggestionInput,
  isQueryStreamDefinition,
} from '@kbn/streams-ai';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import { getEsqlView } from '../../streams/esql_views/manage_esql_views';

export interface DashboardSuggestionTaskParams {
  /** Connector ID for the LLM */
  connectorId: string;
  /** Name of the stream to generate dashboard for */
  streamName: string;
  /** Optional guidance to direct the dashboard suggestion */
  guidance?: string;
}

export const STREAMS_DASHBOARD_SUGGESTION_TASK_TYPE = 'streams_dashboard_suggestion';

/**
 * Generates a task ID for dashboard suggestion based on stream name.
 */
export function getDashboardSuggestionTaskId(streamName: string) {
  return `${STREAMS_DASHBOARD_SUGGESTION_TASK_TYPE}_${streamName}`;
}

/**
 * Creates the dashboard suggestion task definition.
 *
 * This task generates dashboard suggestions for a stream using an AI reasoning agent.
 * It supports both ingest streams (index-backed) and query streams (ES|QL view-backed).
 *
 * The result is stored in the task payload and can be retrieved via the task status API.
 * No Kibana dashboard saved objects are created - the result is by-value only.
 */
export function createStreamsDashboardSuggestionTask(taskContext: TaskContext) {
  return {
    [STREAMS_DASHBOARD_SUGGESTION_TASK_TYPE]: {
      timeout: '30m',
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { connectorId, streamName, guidance, _task } = runContext.taskInstance
                .params as TaskParams<DashboardSuggestionTaskParams>;

              const { taskClient, scopedClusterClient, streamsClient, featureClient, inferenceClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const logger = taskContext.logger.get('dashboard_suggestion');
              const esClient = scopedClusterClient.asCurrentUser;

              try {
                // Get the stream definition
                const definition = await streamsClient.getStream(streamName);

                // Get features for the stream
                const { hits: features } = await featureClient.getFeatures(streamName, {});

                // Prepare input based on stream type
                let esqlQuery: string | undefined;

                if (isQueryStreamDefinition(definition)) {
                  // For query streams, we need to fetch the ES|QL query from the view
                  const queryDefinition = definition as Streams.QueryStream.Definition;
                  const esqlView = await getEsqlView({
                    esClient,
                    logger,
                    name: queryDefinition.query.view,
                  });
                  esqlQuery = esqlView.query;
                }

                const input = prepareDashboardSuggestionInput({
                  definition,
                  features,
                  esqlQuery,
                  guidance,
                });

                // Bind inference client to the connector
                const boundInferenceClient = inferenceClient.bindTo({ connectorId });

                // Generate dashboard suggestion
                const result = await suggestDashboard({
                  input,
                  inferenceClient: boundInferenceClient,
                  esClient,
                  logger,
                  signal: runContext.abortController.signal,
                });

                // Complete the task with the result payload
                await taskClient.complete<DashboardSuggestionTaskParams, DashboardSuggestionResult>(
                  _task,
                  { connectorId, streamName, guidance },
                  result
                );
              } catch (error) {
                // Get connector info for error enrichment
                const connector = await inferenceClient.getConnectorById(connectorId);

                const errorMessage = isInferenceProviderError(error)
                  ? formatInferenceProviderError(error, connector)
                  : error.message;

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                logger.error(`Task ${runContext.taskInstance.id} failed: ${errorMessage}`, {
                  error,
                });

                await taskClient.fail<DashboardSuggestionTaskParams>(
                  _task,
                  { connectorId, streamName, guidance },
                  errorMessage
                );

                return getDeleteTaskRunResult();
              }
            },
            runContext,
            taskContext
          ),
        };
      },
    },
  } satisfies TaskDefinitionRegistry;
}
