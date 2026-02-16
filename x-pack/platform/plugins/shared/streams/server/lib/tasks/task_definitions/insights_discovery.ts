/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import type { InsightsResult } from '@kbn/streams-schema';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { generateInsights } from '../../significant_events/insights/generate_insights';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';

export interface InsightsDiscoveryTaskParams {
  connectorId: string;
}

export const STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE = 'streams_insights_discovery';

export function createStreamsInsightsDiscoveryTask(taskContext: TaskContext) {
  return {
    [STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { connectorId, _task } = runContext.taskInstance
                .params as TaskParams<InsightsDiscoveryTaskParams>;

              const {
                taskClient,
                scopedClusterClient,
                streamsClient,
                inferenceClient,
                queryClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              const boundInferenceClient = inferenceClient.bindTo({ connectorId });

              try {
                const result = await generateInsights({
                  streamsClient,
                  queryClient,
                  esClient: scopedClusterClient.asCurrentUser,
                  inferenceClient: boundInferenceClient,
                  signal: runContext.abortController.signal,
                  logger: taskContext.logger.get('insights_discovery'),
                });

                taskContext.telemetry.trackInsightsGenerated({
                  input_tokens_used: result.tokensUsed?.prompt ?? 0,
                  output_tokens_used: result.tokensUsed?.completion ?? 0,
                  cached_tokens_used: result.tokensUsed?.cached ?? 0,
                });

                await taskClient.complete<InsightsDiscoveryTaskParams, InsightsResult>(
                  _task,
                  { connectorId },
                  result
                );
              } catch (error) {
                // Get connector info for error enrichment
                const connector = await inferenceClient.getConnectorById(connectorId);

                const errorMessage = isInferenceProviderError(error)
                  ? formatInferenceProviderError(error, connector)
                  : getErrorMessage(error);

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                taskContext.logger.error(
                  `Task ${runContext.taskInstance.id} failed: ${errorMessage}`
                );

                await taskClient.fail<InsightsDiscoveryTaskParams>(
                  _task,
                  { connectorId },
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
