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
import {
  PRIORITIZED_CONTENT_FIELDS,
  getDefaultTextField,
  extractMessagesFromField,
} from '../../../../../common/pattern_extraction_helpers';
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { createServerRoute } from '../../../create_server_route';
import { simulateProcessing } from '../processing/simulation_handler';
import { isNoLLMSuggestionsError } from '../processing/no_llm_suggestions_error';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import {
  extractParsedSampleDocuments,
  formatInferenceErrorMeta,
  getErrorMessage,
  processDissectPattern,
  processGrokPatterns,
  type SeedParsingCandidate,
} from './seed_parsing_helpers';

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

        // Resolve the OTel-naming flag once and forward it into both
        // seed-parser branches so their inner LLM-review calls don't
        // re-fetch the stream definition. Without this, the route ends
        // up making three `streamsClient.getStream` round-trips per
        // suggestion call (this one + one inside each review).
        const useOtelFieldNames = isOtelStream(stream);

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
          const candidatePromises: Array<Promise<SeedParsingCandidate | null>> = [];

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
              useOtelFieldNames,
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
              useOtelFieldNames,
              signal: timeoutAbortController.signal,
              logger: log,
            })
          );

          const settled = await Promise.allSettled(candidatePromises);
          const candidates: SeedParsingCandidate[] = [];

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
            useOtelFieldNames,
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
          source: 'ui',
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
