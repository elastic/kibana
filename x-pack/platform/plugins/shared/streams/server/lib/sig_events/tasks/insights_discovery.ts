/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import { isInferenceProviderError } from '@kbn/inference-common';
import {
  type Insight,
  getImpactLevel,
  STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
} from '@kbn/streams-schema';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { TaskContext } from '../../tasks/task_definitions';
import { cancellableTask } from '../../tasks/cancellable_task';
import type { TaskParams } from '../../tasks/types';
import { generateInsights } from '../insights/generate_insights';
import { parseError } from '../../streams/errors/parse_error';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import { resolveConnectorForFeature } from '../../../routes/utils/resolve_connector_for_feature';

export interface InsightsDiscoveryTaskResult {
  insights: Insight[];
  tokensUsed: ChatCompletionTokenCount;
}

export interface InsightsDiscoveryTaskParams {
  /** When provided, only generate insights for these stream names. Otherwise all streams are used. */
  streamNames?: string[];
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
              const { fakeRequest } = runContext;

              const { streamNames, _task } = runContext.taskInstance
                .params as TaskParams<InsightsDiscoveryTaskParams>;

              const {
                taskClient,
                scopedClusterClient,
                streamsClient,
                inferenceClient,
                queryClient,
                insightClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              const taskLogger = taskContext.logger.get('insights_discovery');
              const connectorId = await resolveConnectorForFeature({
                searchInferenceEndpoints: taskContext.server.searchInferenceEndpoints,
                featureId: STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
                featureName: 'discovery',
                request: fakeRequest,
              });
              taskLogger.debug(`Using connector ${connectorId} for discovery`);
              const boundInferenceClient = inferenceClient.bindTo({ connectorId });

              try {
                const result = await generateInsights({
                  streamsClient,
                  queryClient,
                  esClient: scopedClusterClient.asCurrentUser,
                  inferenceClient: boundInferenceClient,
                  signal: runContext.abortController.signal,
                  logger: taskLogger,
                  streamNames,
                });

                taskContext.telemetry.trackInsightsGenerated({
                  input_tokens_used: result.tokens_used?.prompt ?? 0,
                  output_tokens_used: result.tokens_used?.completion ?? 0,
                  cached_tokens_used: result.tokens_used?.cached ?? 0,
                });

                const insights = result.insights.map(
                  (insight) =>
                    ({
                      ...insight,
                      id: uuidv4(),
                      generated_at: new Date().toISOString(),
                      impact_level: getImpactLevel(insight.impact),
                    } satisfies Insight)
                );

                if (result.insights.length > 0) {
                  try {
                    await insightClient.bulk(
                      insights.map((insight) => ({
                        index: insight,
                      }))
                    );
                  } catch (persistError) {
                    taskContext.logger.error(
                      `Failed to persist ${result.insights.length} insights: ${
                        parseError(persistError).message
                      }`
                    );
                  }
                }

                await taskClient.complete<InsightsDiscoveryTaskParams, InsightsDiscoveryTaskResult>(
                  _task,
                  { streamNames },
                  { insights, tokensUsed: result.tokens_used }
                );
              } catch (error) {
                // Get connector info for error enrichment, preserving the original error if lookup fails
                let errorMessage = parseError(error).message;
                try {
                  const connector = await inferenceClient.getConnectorById(connectorId);
                  if (isInferenceProviderError(error)) {
                    errorMessage = formatInferenceProviderError(error, connector);
                  }
                } catch {
                  // Connector lookup failed — use the original error message
                }

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
                  { streamNames },
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
