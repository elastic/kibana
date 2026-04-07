/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { InferenceClient } from '@kbn/inference-common';
import { isInferenceProviderError } from '@kbn/inference-common';
import { suggestProcessingPipeline } from '@kbn/streams-ai';
import { Streams } from '@kbn/streams-schema';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { StreamlangDSL, GrokProcessor, DissectProcessor } from '@kbn/streamlang';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import { simulateProcessing } from '../../../routes/internal/streams/processing/simulation_handler';
import { handleProcessingGrokSuggestions } from '../../../routes/internal/streams/processing/grok_suggestions_handler';
import { handleProcessingDissectSuggestions } from '../../../routes/internal/streams/processing/dissect_suggestions_handler';
import { isNoLLMSuggestionsError } from '../../../routes/internal/streams/processing/no_llm_suggestions_error';
import type { StreamsClient } from '../../streams/client';
import { TaskNotFoundError } from '../../streams/errors/task_not_found_error';
import { isStreamEligibleForPipelineSuggestion } from '../../streams/pipeline_suggestion_eligibility';
import type { IPatternExtractionService } from '../../pattern_extraction/pattern_extraction_service';
import type { PersistedTask } from '../types';
import type { TaskClient } from '../task_client';

export interface PipelineSuggestionTaskParams {
  connectorId: string;
  streamName: string;
  documents: FlattenRecord[];
  fieldName: string;
  sampleMessages: string[];
}

export interface PipelineSuggestionTaskPayload {
  pipeline: StreamlangDSL | null;
}

export const STREAMS_PIPELINE_SUGGESTION_TASK_TYPE = 'streams_pipeline_suggestion';

async function discardPipelineSuggestionTaskIfStreamNoLongerEligible({
  streamsClient,
  taskClient,
  logger,
  streamName,
  _task,
}: {
  streamsClient: StreamsClient;
  taskClient: TaskClient<string>;
  logger: Logger;
  streamName: string;
  _task: PersistedTask;
}): Promise<boolean> {
  try {
    const latestStream = await streamsClient.getStream(streamName);
    if (isStreamEligibleForPipelineSuggestion(latestStream)) {
      return false;
    }
    logger.debug(
      `Discarding pipeline suggestion task for ${streamName}: stream no longer eligible (not ingest or already has processing steps)`
    );
  } catch (error) {
    logger.debug(
      `Discarding pipeline suggestion task for ${streamName}: could not re-fetch stream (${String(
        error
      )})`
    );
  }

  try {
    await taskClient.deleteTask(_task.id);
  } catch (error) {
    if (error instanceof TaskNotFoundError) {
      return true;
    }
    throw error;
  }
  return true;
}

export function createStreamsPipelineSuggestionTask(taskContext: TaskContext) {
  return {
    [STREAMS_PIPELINE_SUGGESTION_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { connectorId, streamName, documents, fieldName, sampleMessages, _task } =
                runContext.taskInstance.params as TaskParams<PipelineSuggestionTaskParams>;

              const {
                taskClient,
                scopedClusterClient,
                streamsClient,
                inferenceClient,
                fieldsMetadataClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              const logger = taskContext.logger.get('pipeline_suggestion');

              try {
                const stream = await streamsClient.getStream(streamName);
                if (!Streams.ingest.all.Definition.is(stream)) {
                  throw new Error('Processing suggestions are only available for ingest streams');
                }
                const abortController = runContext.abortController;
                let parsingProcessor: GrokProcessor | DissectProcessor | undefined;

                if (sampleMessages.length > 0) {
                  const candidatePromises: Array<
                    Promise<{
                      type: 'grok' | 'dissect';
                      processor: GrokProcessor | DissectProcessor;
                      parsedRate: number;
                    } | null>
                  > = [];

                  logger.debug(
                    `(parallel) scheduling grok fieldName=${fieldName} messages=${sampleMessages.length}`
                  );
                  candidatePromises.push(
                    processGrokPatterns({
                      sampleMessages,
                      fieldName,
                      streamName,
                      connectorId,
                      documents,
                      inferenceClient,
                      scopedClusterClient,
                      streamsClient,
                      fieldsMetadataClient,
                      patternExtractionService: taskContext.patternExtractionService,
                      signal: abortController.signal,
                      logger,
                    }).catch((error) => {
                      if (isNoLLMSuggestionsError(error)) {
                        logger.debug('No LLM suggestions available for grok');
                        return null;
                      }
                      throw error;
                    })
                  );

                  logger.debug(
                    `(parallel) scheduling dissect fieldName=${fieldName} messages=${sampleMessages.length}`
                  );
                  candidatePromises.push(
                    processDissectPattern({
                      sampleMessages,
                      fieldName,
                      streamName,
                      connectorId,
                      documents,
                      inferenceClient,
                      scopedClusterClient,
                      streamsClient,
                      fieldsMetadataClient,
                      patternExtractionService: taskContext.patternExtractionService,
                      signal: abortController.signal,
                      logger,
                    }).catch((error) => {
                      if (isNoLLMSuggestionsError(error)) {
                        logger.debug('No LLM suggestions available for dissect');
                        return null;
                      }
                      throw error;
                    })
                  );

                  const results = await Promise.all(candidatePromises);
                  const candidates = results.filter(
                    (
                      r
                    ): r is {
                      type: 'grok' | 'dissect';
                      processor: GrokProcessor | DissectProcessor;
                      parsedRate: number;
                    } => r !== null
                  );
                  candidates.forEach((c) =>
                    logger.debug(`Candidate type=${c.type} parsedRate=${c.parsedRate}`)
                  );
                  if (candidates.length > 0) {
                    candidates.sort((a, b) => b.parsedRate - a.parsedRate);
                    logger.debug(
                      `Selected processor type=${candidates[0].type} parsedRate=${candidates[0].parsedRate}`
                    );
                    parsingProcessor = candidates[0].processor;
                  }
                }

                const pipeline = await suggestProcessingPipeline({
                  definition: stream,
                  inferenceClient: inferenceClient.bindTo({ connectorId }),
                  parsingProcessor,
                  maxSteps: 6,
                  signal: abortController.signal,
                  documents,
                  esClient: scopedClusterClient.asCurrentUser,
                  fieldsMetadataClient,
                  simulatePipeline: (pipelineDef: StreamlangDSL) =>
                    simulateProcessing({
                      params: {
                        path: { name: streamName },
                        body: { processing: pipelineDef, documents },
                      },
                      esClient: scopedClusterClient.asCurrentUser,
                      streamsClient,
                      fieldsMetadataClient,
                    }),
                });

                const discarded = await discardPipelineSuggestionTaskIfStreamNoLongerEligible({
                  streamsClient,
                  taskClient,
                  logger,
                  streamName,
                  _task,
                });
                if (discarded) {
                  return;
                }

                await taskClient.complete<
                  PipelineSuggestionTaskParams,
                  PipelineSuggestionTaskPayload
                >(
                  _task,
                  { connectorId, streamName, documents, fieldName, sampleMessages },
                  { pipeline: pipeline.pipeline }
                );
              } catch (error) {
                // Handle NoLLMSuggestionsError gracefully - complete with null pipeline
                if (isNoLLMSuggestionsError(error)) {
                  logger.debug('No LLM suggestions available for pipeline generation');
                  const discarded = await discardPipelineSuggestionTaskIfStreamNoLongerEligible({
                    streamsClient,
                    taskClient,
                    logger,
                    streamName,
                    _task,
                  });
                  if (discarded) {
                    return;
                  }
                  await taskClient.complete<
                    PipelineSuggestionTaskParams,
                    PipelineSuggestionTaskPayload
                  >(
                    _task,
                    { connectorId, streamName, documents, fieldName, sampleMessages },
                    { pipeline: null }
                  );
                  return;
                }

                // Get connector info for error enrichment
                const connector = await inferenceClient.getConnectorById(connectorId);

                const errorMessage = isInferenceProviderError(error)
                  ? formatInferenceProviderError(error, connector)
                  : error instanceof Error
                  ? error.message
                  : String(error);

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  if (runContext.abortController.signal.aborted) {
                    // User-initiated cancellation: the cancellableTask wrapper
                    // already transitions the task to Canceled via markCanceled().
                    // Calling fail() here would race with that and incorrectly
                    // overwrite the status.
                    return;
                  }
                  // Not user-initiated (e.g. connector timeout) — fail the task
                  logger.error(
                    `Task ${runContext.taskInstance.id} failed with abort error: ${errorMessage}`
                  );
                  await taskClient.fail<PipelineSuggestionTaskParams>(
                    _task,
                    { connectorId, streamName, documents, fieldName, sampleMessages },
                    errorMessage
                  );
                  return;
                }

                logger.error(`Task ${runContext.taskInstance.id} failed: ${errorMessage}`);

                await taskClient.fail<PipelineSuggestionTaskParams>(
                  _task,
                  { connectorId, streamName, documents, fieldName, sampleMessages },
                  errorMessage
                );
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

/**
 * Process grok patterns server-side:
 * - Extract patterns via patternExtractionService (worker threads)
 * - Call LLM to review patterns
 * - Simulate to get parsed rate
 * - Return best grok processor
 */
async function processGrokPatterns({
  sampleMessages,
  fieldName,
  streamName,
  connectorId,
  documents,
  inferenceClient,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
  patternExtractionService,
  signal,
  logger,
}: {
  sampleMessages: string[];
  fieldName: string;
  streamName: string;
  connectorId: string;
  documents: FlattenRecord[];
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  patternExtractionService: IPatternExtractionService;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{ type: 'grok'; processor: GrokProcessor; parsedRate: number } | null> {
  const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

  const grokProcessor = await handleProcessingGrokSuggestions({
    params: {
      path: { name: streamName },
      body: {
        connector_id: connectorId,
        field_name: fieldName,
        sample_messages: sampleMessages,
      },
    },
    inferenceClient,
    scopedClusterClient,
    streamsClient,
    fieldsMetadataClient,
    patternExtractionService,
    signal,
    logger,
  });

  if (!grokProcessor) {
    return null;
  }

  // Run simulation to verify grok patterns work
  const simulationResult = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: {
        documents,
        processing: {
          steps: [
            {
              ...grokProcessor,
              customIdentifier: SUGGESTED_GROK_PROCESSOR_ID,
            },
          ],
        },
      },
    },
    esClient: scopedClusterClient.asCurrentUser,
    streamsClient,
    fieldsMetadataClient,
  });

  const parsedRate =
    simulationResult.processors_metrics[SUGGESTED_GROK_PROCESSOR_ID]?.parsed_rate ?? 0;

  return {
    type: 'grok',
    processor: grokProcessor,
    parsedRate,
  };
}

/**
 * Process dissect patterns server-side:
 * - Extract patterns via patternExtractionService (worker threads)
 * - Call LLM to review pattern
 * - Simulate to get parsed rate
 * - Return dissect processor
 */
async function processDissectPattern({
  sampleMessages,
  fieldName,
  streamName,
  connectorId,
  documents,
  inferenceClient,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
  patternExtractionService,
  signal,
  logger,
}: {
  sampleMessages: string[];
  fieldName: string;
  streamName: string;
  connectorId: string;
  documents: FlattenRecord[];
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  patternExtractionService: IPatternExtractionService;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{ type: 'dissect'; processor: DissectProcessor; parsedRate: number } | null> {
  const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

  if (sampleMessages.length === 0) {
    return null;
  }

  const dissectProcessor = await handleProcessingDissectSuggestions({
    params: {
      path: { name: streamName },
      body: {
        connector_id: connectorId,
        field_name: fieldName,
        sample_messages: sampleMessages,
      },
    },
    inferenceClient,
    scopedClusterClient,
    streamsClient,
    fieldsMetadataClient,
    patternExtractionService,
    signal,
    logger,
  });

  if (!dissectProcessor) {
    return null;
  }

  const simulationResult = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: {
        documents,
        processing: {
          steps: [
            {
              ...dissectProcessor,
              customIdentifier: SUGGESTED_DISSECT_PROCESSOR_ID,
            },
          ],
        },
      },
    },
    esClient: scopedClusterClient.asCurrentUser,
    streamsClient,
    fieldsMetadataClient,
  });

  const parsedRate =
    simulationResult.processors_metrics[SUGGESTED_DISSECT_PROCESSOR_ID]?.parsed_rate ?? 0;

  return {
    type: 'dissect',
    processor: dissectProcessor,
    parsedRate,
  };
}
