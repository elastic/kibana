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
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { ChangeFilteredPipelineParams } from '../../significant_events/insights/change_detection';

export interface InsightsDiscoveryTaskParams {
  connectorId: string;
  /** Stream names to analyze. If undefined, analyzes all streams */
  streamNames?: string[];
  /** Start of time range (epoch ms). Defaults to now-1h */
  from?: number;
  /** End of time range (epoch ms). Defaults to now */
  to?: number;
  /** Bucket size for histogram (e.g., '1h', '15m'). Auto-derived if not provided */
  bucketSize?: string;
  /** Minimum absolute percentage change to include (default: 20 for 20%) */
  changeThreshold?: number;
  /** Maximum number of queries to process (default: 50) */
  maxQueries?: number;
  /** Optional text filter for query search */
  queryFilter?: string;
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

              const {
                connectorId,
                streamNames,
                from,
                to,
                bucketSize,
                changeThreshold,
                maxQueries,
                queryFilter,
                _task,
              } = runContext.taskInstance.params as TaskParams<InsightsDiscoveryTaskParams>;

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
              const logger = taskContext.logger.get('insights_discovery');

              // Build pipeline params if any change-filter params are provided
              const hasPipelineParams = streamNames || from || to || changeThreshold || maxQueries;
              const pipelineParams: ChangeFilteredPipelineParams | undefined = hasPipelineParams
                ? {
                    streamNames,
                    from: from ?? Date.now() - 60 * 60 * 1000, // Default: 1 hour ago
                    to: to ?? Date.now(),
                    bucketSize,
                    changeThreshold,
                    maxQueries,
                    queryFilter,
                  }
                : undefined;

              try {
                const result = await generateInsights({
                  streamsClient,
                  queryClient,
                  esClient: scopedClusterClient.asCurrentUser,
                  scopedClusterClient,
                  inferenceClient: boundInferenceClient,
                  signal: runContext.abortController.signal,
                  logger,
                  pipelineParams,
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
                  : error.message;

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
