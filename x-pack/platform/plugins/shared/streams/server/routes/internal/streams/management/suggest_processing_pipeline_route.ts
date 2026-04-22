/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  buildDocumentStructureOverviewForPipelinePrompt,
  formatUpstreamSeedParsingContextForPromptMarkdown,
  fetchMappedFieldsForStreamProcessingSuggestions,
  mergeSeedParsingProcessorIntoSuggestedPipeline,
  pipelineDefinitionSchema,
  postParsePipelineDefinitionSchema,
  suggestProcessingPipeline,
  type SuggestProcessingPipelineResult,
} from '@kbn/streams-ai';
import { from, map, catchError } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import { createSSEInternalError, createSSERequestError, isSSEError } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import {
  Streams,
  type FlattenRecord,
  flattenRecord,
  getStreamTypeFromDefinition,
  isOtelStream,
} from '@kbn/streams-schema';
import { type StreamlangDSL, type GrokProcessor, type DissectProcessor } from '@kbn/streamlang';
import { type InferenceClient, isInferenceError } from '@kbn/inference-common';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { assembleGrokProcessor, type GrokPatternNode } from '@kbn/grok-heuristics';
import {
  getReviewFields as getDissectReviewFields,
  getDissectProcessorWithReview,
} from '@kbn/dissect-heuristics';
import type { Logger } from '@kbn/logging';
import {
  PRIORITIZED_CONTENT_FIELDS,
  getDefaultTextField,
  extractMessagesFromField,
} from '../../../../../common/pattern_extraction_helpers';
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import type { StreamsClient } from '../../../../lib/streams/client';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { createServerRoute } from '../../../create_server_route';
import { simulateProcessing } from '../processing/simulation_handler';
import { reviewGrokFields } from '../processing/grok_suggestions_handler';
import { reviewDissectFields } from '../processing/dissect_suggestions_handler';
import { isNoLLMSuggestionsError } from '../processing/no_llm_suggestions_error';
import type { IPatternExtractionService } from '../../../../lib/pattern_extraction/pattern_extraction_service';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';

export interface SuggestIngestPipelineParams {
  path: { name: string };
  body: {
    connector_id: string;
    documents: FlattenRecord[];
  };
}

export const suggestIngestPipelineSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
    documents: z.array(flattenRecord),
  }),
}) satisfies z.Schema<SuggestIngestPipelineParams>;

type SuggestProcessingPipelineResponse = Observable<
  ServerSentEventBase<
    'suggested_processing_pipeline',
    { pipeline: SuggestProcessingPipelineResult['pipeline'] }
  >
>;

const MAX_REVIEW_MESSAGES = 10;
const NUM_REVIEW_EXAMPLES = 10;
const SYSTEM_PARSING_PRE_SIM_ID = 'system-suggested-parsing-pre-step';

export const suggestProcessingPipelineRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_suggest_processing_pipeline',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: suggestIngestPipelineSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    patternExtractionService,
    server,
    logger,
    telemetry,
  }): Promise<SuggestProcessingPipelineResponse> => {
    const log = logger.get('suggestProcessingPipeline');
    const { connector_id: connectorId } = params.body;

    // Wrap entire logic in Observable so errors can be sent as SSE events
    return from(
      (async () => {
        const isAvailableForTier = server.core.pricing.isFeatureAvailable(
          STREAMS_TIERED_ML_FEATURE.id
        );
        if (!isAvailableForTier) {
          throw new SecurityError('Cannot access API on the current pricing tier');
        }

        const { inferenceClient, scopedClusterClient, streamsClient, fieldsMetadataClient } =
          await getScopedClients({ request });

        log.debug(`Request received (stream=${params.path.name} connectorId=${connectorId})`);

        const stream = await streamsClient.getStream(params.path.name);
        if (!Streams.ingest.all.Definition.is(stream)) {
          throw new StatusError(
            'Processing suggestions are only available for ingest streams',
            400
          );
        }

        // Get the request abort signal to respect client disconnections
        const requestAbortSignal = getRequestAbortSignal(request);

        // Create a timeout-based AbortSignal for grok/dissect and pipeline suggestions
        // 2 minute timeout for the entire operation
        const OPERATION_TIMEOUT_MS = 2 * 60 * 1000;
        const timeoutSignal = AbortSignal.timeout(OPERATION_TIMEOUT_MS);

        // Combine request abort and timeout signals
        const timeoutAbortController = new AbortController();
        const cleanup = () => timeoutAbortController.abort();
        requestAbortSignal.addEventListener('abort', cleanup);
        timeoutSignal.addEventListener('abort', cleanup);

        let parsingProcessor: GrokProcessor | DissectProcessor | undefined;

        const fieldName = getDefaultTextField(params.body.documents, PRIORITIZED_CONTENT_FIELDS);
        const messages = fieldName
          ? extractMessagesFromField(params.body.documents, fieldName)
          : [];

        if (messages.length > 0) {
          const candidatePromises: Array<
            Promise<{
              type: 'grok' | 'dissect';
              processor: GrokProcessor | DissectProcessor;
              parsedRate: number;
            } | null>
          > = [];

          log.debug(
            `Scheduling parallel grok + dissect extraction (stream=${stream.name} messages=${messages.length} fieldName=${fieldName} connectorId=${connectorId})`
          );

          candidatePromises.push(
            processGrokPatterns({
              messages,
              fieldName,
              streamName: stream.name,
              connectorId,
              documents: params.body.documents,
              patternExtractionService,
              inferenceClient,
              scopedClusterClient,
              streamsClient,
              fieldsMetadataClient,
              signal: timeoutAbortController.signal,
              logger: log,
            })
          );

          candidatePromises.push(
            processDissectPattern({
              messages,
              fieldName,
              streamName: stream.name,
              connectorId,
              documents: params.body.documents,
              patternExtractionService,
              inferenceClient,
              scopedClusterClient,
              streamsClient,
              fieldsMetadataClient,
              signal: timeoutAbortController.signal,
              logger: log,
            })
          );

          const settled = await Promise.allSettled(candidatePromises);
          const candidates: Array<{
            type: 'grok' | 'dissect';
            processor: GrokProcessor | DissectProcessor;
            parsedRate: number;
          }> = [];

          for (const result of settled) {
            if (result.status === 'fulfilled' && result.value !== null) {
              candidates.push(result.value);
            } else if (result.status === 'rejected') {
              const { reason } = result;
              if (isNoLLMSuggestionsError(reason)) {
                log.debug(
                  `No LLM suggestions available (stream=${stream.name} connectorId=${connectorId})`
                );
              } else {
                const meta = formatInferenceErrorMeta(reason);
                log.error(
                  `Candidate failed (stream=${stream.name}` +
                    ` connectorId=${connectorId}${meta}): ${getErrorMessage(reason)}`
                );
              }
            }
          }
          candidates.forEach((c, index) =>
            log.debug(
              `Candidate ${index + 1}/${candidates.length}` +
                ` (stream=${stream.name} type=${c.type} parsedRate=${c.parsedRate})`
            )
          );
          if (candidates.length > 0) {
            candidates.sort((a, b) => b.parsedRate - a.parsedRate);
            log.debug(
              `Selected ${candidates[0].type} processor (stream=${stream.name} parsedRate=${candidates[0].parsedRate})`
            );
            parsingProcessor = candidates[0].processor;
          }
        }

        const maxSteps = 6; // Limit reasoning steps for latency and token cost
        const startTime = Date.now();

        let documentsForAgent = params.body.documents;
        let effectiveParsingProcessor: GrokProcessor | DissectProcessor | undefined =
          parsingProcessor;

        const isOtel = isOtelStream(stream);
        const mappedFields = await fetchMappedFieldsForStreamProcessingSuggestions(
          scopedClusterClient.asCurrentUser,
          stream.name
        );

        if (parsingProcessor) {
          const { parsedDocuments, definitionError } = await extractParsedSampleDocuments({
            streamName: stream.name,
            documents: params.body.documents,
            parsingProcessor,
            scopedClusterClient,
            streamsClient,
            fieldsMetadataClient,
            logger: log,
          });

          if (definitionError) {
            effectiveParsingProcessor = undefined;
            documentsForAgent = params.body.documents;
          } else if (parsedDocuments.length > 0) {
            documentsForAgent = parsedDocuments;
            log.debug(
              `Agent will use ${parsedDocuments.length}/${params.body.documents.length}` +
                ` fully parsed samples (stream=${stream.name})`
            );
          } else {
            log.warn(
              `No fully parsed documents after system parsing step (stream=${stream.name}); ` +
                `falling back to raw samples without system-managed parser mode`
            );
            effectiveParsingProcessor = undefined;
            documentsForAgent = params.body.documents;
          }
        }

        const initialDatasetAnalysisJson = JSON.stringify(
          await buildDocumentStructureOverviewForPipelinePrompt(
            documentsForAgent,
            fieldsMetadataClient,
            isOtel,
            mappedFields
          )
        );

        const agentPipelineSchema = effectiveParsingProcessor
          ? postParsePipelineDefinitionSchema
          : pipelineDefinitionSchema;

        const suggestion = await suggestProcessingPipeline({
          definition: stream,
          inferenceClient: inferenceClient.bindTo({ connectorId }),
          agentPipelineSchema,
          maxSteps,
          maxDurationMs: 180_000, // 3 minutes - surface errors faster than infrastructure timeout
          signal: timeoutAbortController.signal,
          documents: documentsForAgent,
          esClient: scopedClusterClient.asCurrentUser,
          fieldsMetadataClient,
          initialDatasetAnalysisJson,
          mappedFields,
          upstreamSeedParsingContextMarkdown: effectiveParsingProcessor
            ? formatUpstreamSeedParsingContextForPromptMarkdown(effectiveParsingProcessor)
            : undefined,
          simulatePipeline: (pipeline: StreamlangDSL) =>
            simulateProcessing({
              params: {
                path: { name: stream.name },
                body: { processing: pipeline, documents: documentsForAgent },
              },
              esClient: scopedClusterClient.asCurrentUser,
              streamsClient,
              fieldsMetadataClient,
            }),
        });

        const pipeline =
          suggestion.pipeline && effectiveParsingProcessor
            ? mergeSeedParsingProcessorIntoSuggestedPipeline(
                effectiveParsingProcessor,
                suggestion.pipeline
              )
            : suggestion.pipeline;

        const result: SuggestProcessingPipelineResult = {
          ...suggestion,
          pipeline,
        };

        const durationMs = Date.now() - startTime;
        log.debug(
          `Processing pipeline generated (stream=${
            stream.name
          } connectorId=${connectorId} durationMs=${durationMs} steps=${
            result.metadata.stepsUsed
          } hasPipeline=${result.pipeline !== null})`
        );

        telemetry.trackProcessingPipelineSuggested({
          duration_ms: durationMs,
          steps_used: result.metadata.stepsUsed,
          success: result.pipeline !== null,
          stream_name: stream.name,
          stream_type: getStreamTypeFromDefinition(stream),
        });

        return result;
      })()
    ).pipe(
      map((result) => ({
        type: 'suggested_processing_pipeline' as const,
        pipeline: result.pipeline,
      })),
      catchError((error) => {
        if (isNoLLMSuggestionsError(error)) {
          log.debug(
            `No LLM suggestions available for pipeline generation (stream=${params.path.name} connectorId=${connectorId})`
          );
          // Return null pipeline instead of error - frontend will handle this gracefully
          return [
            {
              type: 'suggested_processing_pipeline' as const,
              pipeline: null,
            },
          ];
        }
        const errorMessage = getErrorMessage(error) || 'Failed to generate pipeline suggestion';
        log.error(
          `Failed to generate pipeline suggestion (stream=${params.path.name}` +
            ` connectorId=${connectorId}${formatInferenceErrorMeta(error)}): ${errorMessage}`
        );
        if (isSSEError(error) && error.status) {
          throw createSSERequestError(errorMessage, error.status);
        }
        throw createSSEInternalError(errorMessage);
      })
    );
  },
});

/**
 * Runs the seed grok/dissect processor alone so fully parsed sample shapes can be passed to the agent.
 */
async function extractParsedSampleDocuments({
  streamName,
  documents,
  parsingProcessor,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
  logger,
}: {
  streamName: string;
  documents: FlattenRecord[];
  parsingProcessor: GrokProcessor | DissectProcessor;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  logger: Logger;
}): Promise<{ parsedDocuments: FlattenRecord[]; definitionError: boolean }> {
  const simulationResult = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: {
        documents,
        processing: {
          steps: [{ ...parsingProcessor, customIdentifier: SYSTEM_PARSING_PRE_SIM_ID }],
        },
      },
    },
    esClient: scopedClusterClient.asCurrentUser,
    streamsClient,
    fieldsMetadataClient,
  });

  if (simulationResult.definition_error) {
    logger.warn(
      `Parsing pre-simulation failed (stream=${streamName}): ${simulationResult.definition_error.message}`
    );
    return { parsedDocuments: [], definitionError: true };
  }

  return {
    parsedDocuments: simulationResult.documents
      .filter((doc) => doc.status === 'parsed')
      .map((doc) => doc.value),
    definitionError: false,
  };
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const formatInferenceErrorMeta = (error: unknown): string => {
  if (isInferenceError(error)) {
    const parts: string[] = [];
    if (error.code) parts.push(`code=${error.code}`);
    if (error.meta?.status) parts.push(`status=${error.meta.status}`);
    return parts.length > 0 ? ` ${parts.join(' ')}` : '';
  }
  return '';
};

/**
 * Extract grok patterns server-side, call LLM to review them,
 * simulate to get parsed rate, and return the best grok processor.
 */
async function processGrokPatterns({
  messages,
  fieldName,
  streamName,
  connectorId,
  documents,
  patternExtractionService,
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
  patternExtractionService: IPatternExtractionService;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{ type: 'grok'; processor: GrokProcessor; parsedRate: number } | null> {
  const log = logger.get('grok');
  const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

  let patternGroups: Array<{ messages: string[]; nodes: GrokPatternNode[] }>;
  try {
    const extraction = await patternExtractionService.extractGrokPatterns(messages);
    patternGroups = extraction.patternGroups;
  } catch (err) {
    log.warn(
      `Extraction failed, skipping grok seed (stream=${streamName}): ${getErrorMessage(err)}`
    );
    return null;
  }

  if (patternGroups.length === 0) {
    return null;
  }

  const combinedGrokProcessor = await assembleGrokProcessor({
    from: fieldName,
    patternGroups,
    reviewFn: async (reviewFields, reviewMessages) => {
      log.debug(
        `Reviewing group (stream=${streamName} messages=${reviewMessages.length} connectorId=${connectorId})`
      );
      try {
        const result = await reviewGrokFields({
          streamName,
          connectorId,
          fieldName,
          sampleMessages: reviewMessages,
          reviewFields,
          inferenceClient,
          streamsClient,
          fieldsMetadataClient,
          signal,
        });
        log.debug(`LLM review response received (stream=${streamName} connectorId=${connectorId})`);
        return result;
      } catch (error) {
        const meta = formatInferenceErrorMeta(error);
        log.error(
          `LLM review failed` +
            ` (stream=${streamName} connectorId=${connectorId}${meta}): ${getErrorMessage(error)}`
        );
        throw error;
      }
    },
  });

  if (!combinedGrokProcessor) {
    log.debug(`No grok processor produced (stream=${streamName} connectorId=${connectorId})`);
    return null;
  }

  log.debug(
    `Assembled grok processor (stream=${streamName} patterns=${combinedGrokProcessor.patterns.length} connectorId=${connectorId})`
  );

  const simulationResult = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: {
        documents,
        processing: {
          steps: [
            {
              ...combinedGrokProcessor,
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

  log.debug(
    `Simulation complete (stream=${streamName} parsedRate=${parsedRate} connectorId=${connectorId})`
  );

  return {
    type: 'grok',
    processor: combinedGrokProcessor,
    parsedRate,
  };
}

/**
 * Extract dissect pattern server-side, call LLM to review it,
 * simulate to get parsed rate, and return the dissect processor.
 */
async function processDissectPattern({
  messages,
  fieldName,
  streamName,
  connectorId,
  documents,
  patternExtractionService,
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
  patternExtractionService: IPatternExtractionService;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{ type: 'dissect'; processor: DissectProcessor; parsedRate: number } | null> {
  const log = logger.get('dissect');
  const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

  if (messages.length === 0) {
    return null;
  }

  let dissectPattern;
  let largestGroupMessages: string[];
  try {
    const extraction = await patternExtractionService.extractDissectPattern(messages);
    dissectPattern = extraction.dissectPattern;
    largestGroupMessages = extraction.largestGroupMessages;
  } catch (err) {
    log.warn(
      `Extraction failed, skipping dissect seed (stream=${streamName}): ${getErrorMessage(err)}`
    );
    return null;
  }

  if (!dissectPattern.ast.nodes.length) {
    return null;
  }

  const reviewFields = getDissectReviewFields(dissectPattern, NUM_REVIEW_EXAMPLES);

  let reviewResult;
  try {
    log.debug(
      `Reviewing fields (stream=${streamName} messages=${largestGroupMessages.length} connectorId=${connectorId})`
    );
    reviewResult = await reviewDissectFields({
      streamName,
      connectorId,
      fieldName,
      sampleMessages: largestGroupMessages.slice(0, MAX_REVIEW_MESSAGES),
      reviewFields,
      inferenceClient,
      streamsClient,
      fieldsMetadataClient,
      signal,
    });
    log.debug(`LLM review response received (stream=${streamName} connectorId=${connectorId})`);
  } catch (error) {
    const meta = formatInferenceErrorMeta(error);
    log.error(
      `LLM review failed` +
        ` (stream=${streamName} connectorId=${connectorId}${meta}): ${getErrorMessage(error)}`
    );
    throw error;
  }

  const result = getDissectProcessorWithReview(dissectPattern, reviewResult, fieldName);

  if (!result.pattern || result.pattern.trim().length === 0) {
    log.debug(`No dissect processor produced (stream=${streamName} connectorId=${connectorId})`);
    return null;
  }

  const dissectProcessor: DissectProcessor = {
    action: 'dissect',
    from: fieldName,
    pattern: result.pattern,
    append_separator: result.processor.dissect.append_separator,
    description: result.description,
  };

  log.debug(`Assembled dissect processor (stream=${streamName} connectorId=${connectorId})`);

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

  log.debug(
    `Simulation complete (stream=${streamName} parsedRate=${parsedRate} connectorId=${connectorId})`
  );

  return {
    type: 'dissect',
    processor: dissectProcessor,
    parsedRate,
  };
}
