/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import { suggestProcessingPipeline } from '@kbn/streams-ai';
import { Streams } from '@kbn/streams-schema';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { StreamlangDSL, GrokProcessor, DissectProcessor } from '@kbn/streamlang';
import {
  getGrokProcessor,
  getReviewFields as getGrokReviewFields,
  mergeGrokProcessors,
  type GrokProcessorResult,
} from '@kbn/grok-heuristics';
import {
  getDissectProcessorWithReview,
  getReviewFields as getDissectReviewFields,
  extractDissectPattern,
  groupMessagesByPattern as groupMessagesByDissectPattern,
} from '@kbn/dissect-heuristics';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import { simulateProcessing } from '../../../routes/internal/streams/processing/simulation_handler';
import { handleProcessingGrokSuggestions } from '../../../routes/internal/streams/processing/grok_suggestions_handler';
import { handleProcessingDissectSuggestions } from '../../../routes/internal/streams/processing/dissect_suggestions_handler';
import { isNoLLMSuggestionsError } from '../../../routes/internal/streams/processing/no_llm_suggestions_error';

export interface PipelineSuggestionTaskParams {
  connectorId: string;
  streamName: string;
  documents: FlattenRecord[];
  extractedPatterns: {
    grok: {
      fieldName: string;
      patternGroups: Array<{
        messages: string[];
        nodes: Array<{ pattern: string } | { id: string; component: string; values: string[] }>;
      }>;
    } | null;
    dissect: {
      fieldName: string;
      messages: string[];
    } | null;
  };
}

export interface PipelineSuggestionTaskPayload {
  pipeline: StreamlangDSL | null;
}

export const STREAMS_PIPELINE_SUGGESTION_TASK_TYPE = 'streams_pipeline_suggestion';

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

              const { connectorId, streamName, documents, extractedPatterns, _task } = runContext
                .taskInstance.params as TaskParams<PipelineSuggestionTaskParams>;

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

                if (extractedPatterns) {
                  const { grok, dissect } = extractedPatterns;
                  const candidatePromises: Array<
                    Promise<{
                      type: 'grok' | 'dissect';
                      processor: GrokProcessor | DissectProcessor;
                      parsedRate: number;
                    } | null>
                  > = [];

                  if (grok) {
                    logger.debug(
                      `(parallel) scheduling grok patternGroups=${grok.patternGroups.length} fieldName=${grok.fieldName}`
                    );
                    candidatePromises.push(
                      processGrokPatterns({
                        patternGroups: grok.patternGroups,
                        fieldName: grok.fieldName,
                        streamName,
                        connectorId,
                        documents,
                        inferenceClient,
                        scopedClusterClient,
                        streamsClient,
                        fieldsMetadataClient,
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
                  }

                  if (dissect) {
                    logger.debug(
                      `(parallel) scheduling dissect messages=${dissect.messages.length} fieldName=${dissect.fieldName}`
                    );
                    candidatePromises.push(
                      processDissectPattern({
                        messages: dissect.messages,
                        fieldName: dissect.fieldName,
                        streamName,
                        connectorId,
                        documents,
                        inferenceClient,
                        scopedClusterClient,
                        streamsClient,
                        fieldsMetadataClient,
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
                  }

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
                      scopedClusterClient,
                      streamsClient,
                      fieldsMetadataClient,
                    }),
                });

                await taskClient.complete<
                  PipelineSuggestionTaskParams,
                  PipelineSuggestionTaskPayload
                >(_task, { connectorId, streamName, documents, extractedPatterns }, { pipeline });
              } catch (error) {
                // Handle NoLLMSuggestionsError gracefully - complete with null pipeline
                if (isNoLLMSuggestionsError(error)) {
                  logger.debug('No LLM suggestions available for pipeline generation');
                  await taskClient.complete<
                    PipelineSuggestionTaskParams,
                    PipelineSuggestionTaskPayload
                  >(
                    _task,
                    { connectorId, streamName, documents, extractedPatterns },
                    { pipeline: null }
                  );
                  return;
                }

                // Get connector info for error enrichment
                const connector = await inferenceClient.getConnectorById(connectorId);

                const errorMessage = isInferenceProviderError(error)
                  ? formatInferenceProviderError(error, connector)
                  : error.message;

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return;
                }

                logger.error(`Task ${runContext.taskInstance.id} failed: ${errorMessage}`);

                await taskClient.fail<PipelineSuggestionTaskParams>(
                  _task,
                  { connectorId, streamName, documents, extractedPatterns },
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
 * Process grok patterns extracted client-side:
 * - Call LLM to review patterns
 * - Simulate to get parsed rate
 * - Return best grok processor
 */
async function processGrokPatterns({
  patternGroups,
  fieldName,
  streamName,
  connectorId,
  documents,
  inferenceClient,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
  signal,
  logger,
}: {
  patternGroups: Array<{
    messages: string[];
    nodes: Array<{ pattern: string } | { id: string; component: string; values: string[] }>;
  }>;
  fieldName: string;
  streamName: string;
  connectorId: string;
  documents: FlattenRecord[];
  inferenceClient: any;
  scopedClusterClient: any;
  streamsClient: any;
  fieldsMetadataClient: any;
  signal: AbortSignal;
  logger: any;
}): Promise<{ type: 'grok'; processor: GrokProcessor; parsedRate: number } | null> {
  const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

  // Request grok pattern reviews for each group in parallel
  const grokResults = await Promise.allSettled(
    patternGroups.map(async (group) => {
      logger.debug(`[grok] Reviewing group messages=${group.messages.length}`);
      // Call LLM to review patterns directly
      const patterns = group.nodes
        .filter((node): node is { pattern: string } => 'pattern' in node)
        .map((node) => node.pattern);
      logger.debug(`[grok] Derived patterns=${patterns.length}`);

      const grokProcessor = await handleProcessingGrokSuggestions({
        params: {
          path: { name: streamName },
          body: {
            connector_id: connectorId,
            sample_messages: group.messages,
            review_fields: getGrokReviewFields(group.nodes as any, 10),
          },
        },
        inferenceClient,
        scopedClusterClient,
        streamsClient,
        fieldsMetadataClient,
        signal,
        logger,
      });
      logger.debug('[grok] LLM review response received');

      const grokProcessorResult = getGrokProcessor(
        patterns.map((pattern) => ({ pattern })),
        grokProcessor
      );
      logger.debug(
        `[grok] getGrokProcessor produced patterns=${grokProcessorResult.patterns.length}`
      );

      return grokProcessorResult;
    })
  );

  // Collect successful results
  const grokProcessors = grokResults.reduce<GrokProcessorResult[]>((acc, result) => {
    if (result.status === 'fulfilled') {
      acc.push(result.value);
    } else {
      logger.error('[grok] LLM review failed:', result.reason);
    }
    return acc;
  }, []);

  if (grokProcessors.length === 0) {
    return null;
  }

  // Merge all grok processors into one
  const combinedGrokProcessor = mergeGrokProcessors(grokProcessors);

  // Run simulation to verify grok patterns work
  const simulationResult = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: {
        documents,
        processing: {
          steps: [
            {
              action: 'grok',
              customIdentifier: SUGGESTED_GROK_PROCESSOR_ID,
              from: fieldName,
              patterns: combinedGrokProcessor.patterns,
            },
          ],
        },
      },
    },
    scopedClusterClient,
    streamsClient,
    fieldsMetadataClient,
  });

  const parsedRate =
    simulationResult.processors_metrics[SUGGESTED_GROK_PROCESSOR_ID]?.parsed_rate ?? 0;

  return {
    type: 'grok',
    processor: {
      action: 'grok',
      from: fieldName,
      patterns: combinedGrokProcessor.patterns as [string, ...string[]],
    },
    parsedRate,
  };
}

/**
 * Process dissect patterns by extracting them server-side:
 * - Extract dissect pattern from messages
 * - Call LLM to review pattern
 * - Simulate to get parsed rate
 * - Return dissect processor
 */
async function processDissectPattern({
  messages,
  fieldName,
  streamName,
  connectorId,
  documents,
  inferenceClient,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
  signal,
  logger,
}: {
  messages: string[];
  fieldName: string;
  streamName: string;
  connectorId: string;
  documents: FlattenRecord[];
  inferenceClient: any;
  scopedClusterClient: any;
  streamsClient: any;
  fieldsMetadataClient: any;
  signal: AbortSignal;
  logger: any;
}): Promise<{ type: 'dissect'; processor: DissectProcessor; parsedRate: number } | null> {
  const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

  if (messages.length === 0) {
    return null;
  }

  // Extract dissect pattern on server-side
  logger.debug('[dissect] Grouping messages by pattern');
  const grouped = groupMessagesByDissectPattern(messages);
  if (grouped.length === 0) {
    logger.debug('[dissect] No patterns found in messages');
    return null;
  }

  const largestGroup = grouped[0];
  logger.debug(
    `[dissect] Extracting pattern from largest group messages=${largestGroup.messages.length}`
  );
  const dissectPattern = extractDissectPattern(largestGroup.messages);

  if (!dissectPattern.ast.nodes.length) {
    logger.debug('[dissect] No AST nodes in extracted pattern');
    return null;
  }

  // Use extracted fields for review & processor generation
  const reviewFields = getDissectReviewFields(dissectPattern, 10);
  const dissectReview = await handleProcessingDissectSuggestions({
    params: {
      path: { name: streamName },
      body: {
        connector_id: connectorId,
        sample_messages: largestGroup.messages.slice(0, 10),
        review_fields: reviewFields,
      },
    },
    inferenceClient,
    scopedClusterClient,
    streamsClient,
    fieldsMetadataClient,
    signal,
    logger,
  });

  const dissectProcessor = getDissectProcessorWithReview(dissectPattern, dissectReview, fieldName);
  const pattern = dissectProcessor.pattern;

  if (!pattern || pattern.trim().length === 0) {
    logger.debug('[dissect] Empty pattern generated; skipping simulation');
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
              action: 'dissect',
              customIdentifier: SUGGESTED_DISSECT_PROCESSOR_ID,
              from: fieldName,
              pattern,
            },
          ],
        },
      },
    },
    scopedClusterClient,
    streamsClient,
    fieldsMetadataClient,
  });

  const parsedRate =
    simulationResult.processors_metrics[SUGGESTED_DISSECT_PROCESSOR_ID]?.parsed_rate ?? 0;

  return {
    type: 'dissect',
    processor: {
      action: 'dissect',
      from: fieldName,
      pattern,
      append_separator: ' ',
    },
    parsedRate,
  };
}
