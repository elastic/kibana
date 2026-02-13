/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { partitionStream } from '@kbn/streams-ai';
import { Streams } from '@kbn/streams-schema';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';

export interface StreamsSuggestionTaskParams {
  connectorId: string;
  streamName: string;
  start: number;
  end: number;
}

/**
 * Placeholder types for engine integration results.
 * These will be replaced with proper types from @kbn/streams-schema when the
 * dashboard engine (issue-371, PR #253120) and mapping engine (issue-377, PR #253104)
 * PRs are merged.
 */

/**
 * Result from dashboard suggestion engine.
 * @see https://github.com/elastic/kibana-ralph/issues/371
 */
export interface DashboardEngineResult {
  streamName: string;
  inputType: 'ingest' | 'query';
  dashboardSuggestion?: {
    rawDashboard: unknown;
  };
  warnings: string[];
  error?: string;
  tokensUsed?: { prompt: number; completion: number; cached: number };
}

/**
 * Result from mapping suggestion engine.
 * @see https://github.com/elastic/kibana-ralph/issues/377
 */
export interface MappingEngineResult {
  streamName: string;
  stats: {
    totalFields: number;
    mappedCount: number;
    skippedCount: number;
    errorCount: number;
  };
  fields: Array<{
    name: string;
    status: 'mapped' | 'skipped';
    type?: string;
    source?: string;
    reason?: string;
    occurrenceRate?: number;
  }>;
  applied: boolean;
  error?: string;
}

export interface StreamSuggestionResult {
  name: string;
  status: 'created' | 'failed';
  error?: string;
  /** Result from dashboard suggestion engine - populated when engine integration is available */
  dashboardResult?: DashboardEngineResult;
  /** Result from mapping suggestion engine - populated when engine integration is available */
  mappingResult?: MappingEngineResult;
}

export interface StreamsSuggestionTaskPayload {
  streams: StreamSuggestionResult[];
  tokensUsed?: { prompt: number; completion: number; cached: number };
}

export const STREAMS_SUGGESTION_TASK_TYPE = 'streams_suggestion';

export function getStreamsSuggestionTaskId(streamName: string) {
  return `${STREAMS_SUGGESTION_TASK_TYPE}_${streamName}`;
}

/**
 * Dashboard engine integration point.
 * TODO: Replace with actual implementation when PR #253120 (issue-371) is merged.
 *
 * Expected integration:
 * ```typescript
 * import { suggestDashboard, prepareDashboardSuggestionInput } from '@kbn/streams-ai';
 *
 * const features = await featureClient.getFeatures(childStreamName);
 * const input = prepareDashboardSuggestionInput({
 *   definition: childStream,
 *   features: features.hits,
 * });
 * const result = await suggestDashboard({
 *   input,
 *   inferenceClient: boundInferenceClient,
 *   esClient: scopedClusterClient.asCurrentUser,
 *   logger,
 *   signal: runContext.abortController.signal,
 * });
 * ```
 */
async function invokeDashboardEngine(
  _childStreamName: string,
  _deps: {
    signal: AbortSignal;
  }
): Promise<DashboardEngineResult | undefined> {
  // Engine integration not yet available - will be enabled when PR #253120 merges
  // Return undefined to indicate engine was not invoked
  return undefined;
}

/**
 * Mapping engine integration point.
 * TODO: Replace with actual implementation when PR #253104 (issue-377) is merged.
 *
 * Expected integration:
 * ```typescript
 * import { MappingSuggestionEngine } from '../../streams/mapping_suggestions';
 *
 * const mappingEngine = new MappingSuggestionEngine({
 *   esClient: scopedClusterClient.asCurrentUser,
 *   fieldsMetadataClient,
 *   streamsClient,
 *   logger,
 * });
 * const result = await mappingEngine.suggestMappings(childStreamName, {
 *   start,
 *   end,
 *   sampleSize: 500,
 *   minOccurrenceRate: 0.1,
 *   autoApply: true,
 * });
 * ```
 */
async function invokeMappingEngine(
  _childStreamName: string,
  _deps: {
    start: number;
    end: number;
    signal: AbortSignal;
  }
): Promise<MappingEngineResult | undefined> {
  // Engine integration not yet available - will be enabled when PR #253104 merges
  // Return undefined to indicate engine was not invoked
  return undefined;
}

export function createStreamsSuggestionTask(taskContext: TaskContext) {
  return {
    [STREAMS_SUGGESTION_TASK_TYPE]: {
      timeout: '60m', // Extended timeout for multi-step orchestration
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { connectorId, streamName, start, end, _task } = runContext.taskInstance
                .params as TaskParams<StreamsSuggestionTaskParams>;

              const { taskClient, scopedClusterClient, streamsClient, inferenceClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const boundInferenceClient = inferenceClient.bindTo({ connectorId });
              const logger = taskContext.logger.get('streams_suggestion');

              try {
                // Step 1: Get the parent stream definition
                const parentStream = await streamsClient.getStream(streamName);
                if (!Streams.ingest.all.Definition.is(parentStream)) {
                  throw new Error('Partition suggestions are only available for ingest streams');
                }

                // Step 2: Run partition suggestions
                logger.info(`Starting partition suggestions for stream ${streamName}`);
                const partitions = await partitionStream({
                  definition: parentStream,
                  inferenceClient: boundInferenceClient,
                  esClient: scopedClusterClient.asCurrentUser,
                  logger,
                  start,
                  end,
                  maxSteps: 1,
                  signal: runContext.abortController.signal,
                });

                logger.info(`Found ${partitions.length} partition suggestions for ${streamName}`);

                const results: StreamSuggestionResult[] = [];

                // Step 3: Create disabled (draft) child streams for each suggested partition
                // and invoke engine integrations
                for (const partition of partitions) {
                  // Check if task was canceled before processing each stream
                  if (runContext.abortController.signal.aborted) {
                    logger.info('Task canceled, stopping partition processing');
                    break;
                  }

                  const result: StreamSuggestionResult = {
                    name: partition.name,
                    status: 'created',
                  };

                  try {
                    // Step 3a: Create draft child stream with suggestion flag
                    await streamsClient.forkStream({
                      parent: streamName,
                      name: partition.name,
                      where: partition.condition,
                      status: 'disabled',
                      suggestion: true,
                    });

                    logger.debug(`Created draft stream ${partition.name}`);

                    // Step 3b: Invoke mapping engine for the new child stream
                    // This will auto-apply mapping suggestions to the draft stream
                    if (!runContext.abortController.signal.aborted) {
                      try {
                        result.mappingResult = await invokeMappingEngine(partition.name, {
                          start,
                          end,
                          signal: runContext.abortController.signal,
                        });
                      } catch (mappingError) {
                        logger.warn(
                          `Mapping engine failed for ${partition.name}: ${mappingError.message}`
                        );
                        result.mappingResult = {
                          streamName: partition.name,
                          stats: { totalFields: 0, mappedCount: 0, skippedCount: 0, errorCount: 1 },
                          fields: [],
                          applied: false,
                          error: mappingError.message,
                        };
                      }
                    }

                    // Step 3c: Invoke dashboard engine for the new child stream
                    // This generates a dashboard suggestion stored in the result payload (not persisted)
                    if (!runContext.abortController.signal.aborted) {
                      try {
                        result.dashboardResult = await invokeDashboardEngine(partition.name, {
                          signal: runContext.abortController.signal,
                        });
                      } catch (dashboardError) {
                        logger.warn(
                          `Dashboard engine failed for ${partition.name}: ${dashboardError.message}`
                        );
                        result.dashboardResult = {
                          streamName: partition.name,
                          inputType: 'ingest',
                          warnings: [],
                          error: dashboardError.message,
                        };
                      }
                    }
                  } catch (forkError) {
                    result.status = 'failed';
                    result.error = forkError.message;
                    logger.warn(
                      `Failed to create draft stream ${partition.name}: ${forkError.message}`
                    );
                  }

                  results.push(result);
                }

                const payload: StreamsSuggestionTaskPayload = {
                  streams: results,
                };

                logger.info(
                  `Completed stream suggestions: ${
                    results.filter((r) => r.status === 'created').length
                  } created, ` + `${results.filter((r) => r.status === 'failed').length} failed`
                );

                await taskClient.complete<
                  StreamsSuggestionTaskParams,
                  StreamsSuggestionTaskPayload
                >(_task, { connectorId, streamName, start, end }, payload);
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

                await taskClient.fail<StreamsSuggestionTaskParams>(
                  _task,
                  { connectorId, streamName, start, end },
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
