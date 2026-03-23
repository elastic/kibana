/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { suggestProcessingPipeline, type SuggestProcessingPipelineResult } from '@kbn/streams-ai';
import { from, map, catchError } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import { createSSEInternalError, createSSERequestError, isSSEError } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import {
  Streams,
  type FlattenRecord,
  flattenRecord,
  getStreamTypeFromDefinition,
} from '@kbn/streams-schema';
import { type StreamlangDSL, type GrokProcessor, type DissectProcessor } from '@kbn/streamlang';
import { type InferenceClient, isInferenceError } from '@kbn/inference-common';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { assembleGrokProcessor, type GrokPatternNode } from '@kbn/grok-heuristics';
import { assembleDissectProcessor } from '@kbn/dissect-heuristics';
import type { Logger } from '@kbn/logging';
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import type { StreamsClient } from '../../../../lib/streams/client';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { createServerRoute } from '../../../create_server_route';
import { simulateProcessing } from '../processing/simulation_handler';
import { handleProcessingGrokSuggestions } from '../processing/grok_suggestions_handler';
import { handleProcessingDissectSuggestions } from '../processing/dissect_suggestions_handler';
import { isNoLLMSuggestionsError } from '../processing/no_llm_suggestions_error';

export interface SuggestIngestPipelineParams {
  path: { name: string };
  body: {
    connector_id: string;
    documents: FlattenRecord[];
    extracted_patterns: {
      grok: {
        fieldName: string;
        patternGroups: Array<{
          messages: string[];
          nodes: GrokPatternNode[];
        }>;
      } | null;
      dissect: {
        fieldName: string;
        messages: string[];
      } | null;
    };
  };
}

export const suggestIngestPipelineSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
    documents: z.array(flattenRecord),
    extracted_patterns: z.object({
      grok: z
        .object({
          fieldName: z.string(),
          patternGroups: z.array(
            z.object({
              messages: z.array(z.string()),
              nodes: z.array(
                z.union([
                  z.object({ pattern: z.string() }),
                  z.object({
                    id: z.string(),
                    component: z.string(),
                    values: z.array(z.string()),
                  }),
                ])
              ),
            })
          ),
        })
        .nullable(),
      dissect: z
        .object({
          fieldName: z.string(),
          messages: z.array(z.string()),
        })
        .nullable(),
    }),
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
    server,
    logger,
    telemetry,
  }): Promise<SuggestProcessingPipelineResponse> => {
    logger.debug(
      `[${params.path.name}][suggest_pipeline] Request received (connectorId=${
        params.body.connector_id
      } grok=${Boolean(params.body.extracted_patterns?.grok)} dissect=${Boolean(
        params.body.extracted_patterns?.dissect
      )})`
    );

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

        const stream = await streamsClient.getStream(params.path.name);
        if (!Streams.ingest.all.Definition.is(stream)) {
          throw new StatusError(
            'Processing suggestions are only available for ingest streams',
            400
          );
        }

        const abortController = new AbortController();
        let parsingProcessor: GrokProcessor | DissectProcessor | undefined;

        if (params.body.extracted_patterns) {
          const { grok, dissect } = params.body.extracted_patterns;
          const candidatePromises: Array<
            Promise<{
              type: 'grok' | 'dissect';
              processor: GrokProcessor | DissectProcessor;
              parsedRate: number;
            } | null>
          > = [];

          if (grok) {
            logger.debug(
              `[${stream.name}][suggest_pipeline] (parallel) scheduling grok (patternGroups=${grok.patternGroups.length} fieldName=${grok.fieldName} connectorId=${params.body.connector_id})`
            );
            candidatePromises.push(
              processGrokPatterns({
                patternGroups: grok.patternGroups,
                fieldName: grok.fieldName,
                streamName: stream.name,
                connectorId: params.body.connector_id,
                documents: params.body.documents,
                inferenceClient,
                scopedClusterClient,
                streamsClient,
                fieldsMetadataClient,
                signal: abortController.signal,
                logger,
              })
            );
          }
          if (dissect) {
            logger.debug(
              `[${stream.name}][suggest_pipeline] (parallel) scheduling dissect (messages=${dissect.messages.length} fieldName=${dissect.fieldName} connectorId=${params.body.connector_id})`
            );
            candidatePromises.push(
              processDissectPattern({
                messages: dissect.messages,
                fieldName: dissect.fieldName,
                streamName: stream.name,
                connectorId: params.body.connector_id,
                documents: params.body.documents,
                inferenceClient,
                scopedClusterClient,
                streamsClient,
                fieldsMetadataClient,
                signal: abortController.signal,
                logger,
              })
            );
          }

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
                logger.debug(
                  `[${stream.name}][suggest_pipeline] No LLM suggestions available (connectorId=${params.body.connector_id})`
                );
              } else {
                const meta = formatInferenceErrorMeta(reason);
                logger.error(
                  `[${stream.name}][suggest_pipeline] Candidate failed` +
                    ` (connectorId=${params.body.connector_id}${meta}): ${getErrorMessage(reason)}`
                );
              }
            }
          }
          candidates.forEach((c, index) =>
            logger.debug(
              `[${stream.name}][suggest_pipeline] Candidate ${index + 1}/${
                candidates.length
              } (type=${c.type} parsedRate=${c.parsedRate})`
            )
          );
          if (candidates.length > 0) {
            candidates.sort((a, b) => b.parsedRate - a.parsedRate);
            logger.debug(
              `[${stream.name}][suggest_pipeline] Selected ${candidates[0].type} processor (parsedRate=${candidates[0].parsedRate})`
            );
            parsingProcessor = candidates[0].processor;
          }
        }

        const maxSteps = 6; // Limit reasoning steps for latency and token cost
        const startTime = Date.now();

        const result = await suggestProcessingPipeline({
          definition: stream,
          inferenceClient: inferenceClient.bindTo({ connectorId: params.body.connector_id }),
          parsingProcessor,
          maxSteps,
          signal: abortController.signal,
          documents: params.body.documents,
          esClient: scopedClusterClient.asCurrentUser,
          fieldsMetadataClient,
          simulatePipeline: (pipeline: StreamlangDSL) =>
            simulateProcessing({
              params: {
                path: { name: stream.name },
                body: { processing: pipeline, documents: params.body.documents },
              },
              esClient: scopedClusterClient.asCurrentUser,
              streamsClient,
              fieldsMetadataClient,
            }),
        });

        const durationMs = Date.now() - startTime;
        logger.debug(
          `[${stream.name}][suggest_pipeline] Processing pipeline generated (connectorId=${
            params.body.connector_id
          } durationMs=${durationMs} steps=${result.metadata.stepsUsed} hasPipeline=${
            result.pipeline !== null
          })`
        );

        // Report telemetry for pipeline suggestion
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
          logger.debug(
            `[${params.path.name}][suggest_pipeline] No LLM suggestions available for pipeline generation (connectorId=${params.body.connector_id})`
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
        logger.error(
          `[${params.path.name}][suggest_pipeline] Failed to generate pipeline suggestion` +
            ` (connectorId=${params.body.connector_id}${formatInferenceErrorMeta(
              error
            )}): ${errorMessage}`
        );
        if (isSSEError(error) && error.status) {
          throw createSSERequestError(errorMessage, error.status);
        }
        throw createSSEInternalError(errorMessage);
      })
    );
  },
});

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
    nodes: GrokPatternNode[];
  }>;
  fieldName: string;
  streamName: string;
  connectorId: string;
  documents: FlattenRecord[];
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{ type: 'grok'; processor: GrokProcessor; parsedRate: number } | null> {
  const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

  const combinedGrokProcessor = await assembleGrokProcessor({
    from: fieldName,
    patternGroups,
    reviewFn: async (reviewFields, messages) => {
      logger.debug(
        `[${streamName}][suggest_pipeline][grok] Reviewing group (messages=${messages.length} connectorId=${connectorId})`
      );
      try {
        const result = await handleProcessingGrokSuggestions({
          params: {
            path: { name: streamName },
            body: {
              connector_id: connectorId,
              sample_messages: messages,
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
        logger.debug(
          `[${streamName}][suggest_pipeline][grok] LLM review response received (connectorId=${connectorId})`
        );
        return result;
      } catch (error) {
        const meta = formatInferenceErrorMeta(error);
        logger.error(
          `[${streamName}][suggest_pipeline][grok] LLM review failed` +
            ` (connectorId=${connectorId}${meta}): ${getErrorMessage(error)}`
        );
        throw error;
      }
    },
  });

  if (!combinedGrokProcessor) {
    logger.debug(
      `[${streamName}][suggest_pipeline][grok] No grok processor produced (connectorId=${connectorId})`
    );
    return null;
  }

  logger.debug(
    `[${streamName}][suggest_pipeline][grok] Assembled grok processor (patterns=${combinedGrokProcessor.patterns.length} connectorId=${connectorId})`
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

  logger.debug(
    `[${streamName}][suggest_pipeline][grok] Simulation complete (parsedRate=${parsedRate} connectorId=${connectorId})`
  );

  return {
    type: 'grok',
    processor: combinedGrokProcessor,
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
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{ type: 'dissect'; processor: DissectProcessor; parsedRate: number } | null> {
  const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

  if (messages.length === 0) {
    return null;
  }

  const dissectResult = await assembleDissectProcessor({
    from: fieldName,
    messages,
    reviewFn: async (reviewFields, sampleMessages) => {
      logger.debug(
        `[${streamName}][suggest_pipeline][dissect] Reviewing fields (messages=${sampleMessages.length} connectorId=${connectorId})`
      );
      try {
        const result = await handleProcessingDissectSuggestions({
          params: {
            path: { name: streamName },
            body: {
              connector_id: connectorId,
              sample_messages: sampleMessages,
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
        logger.debug(
          `[${streamName}][suggest_pipeline][dissect] LLM review response received (connectorId=${connectorId})`
        );
        return result;
      } catch (error) {
        const meta = formatInferenceErrorMeta(error);
        logger.error(
          `[${streamName}][suggest_pipeline][dissect] LLM review failed` +
            ` (connectorId=${connectorId}${meta}): ${getErrorMessage(error)}`
        );
        throw error;
      }
    },
  });

  if (!dissectResult) {
    logger.debug(
      `[${streamName}][suggest_pipeline][dissect] No dissect processor produced (connectorId=${connectorId})`
    );
    return null;
  }

  logger.debug(
    `[${streamName}][suggest_pipeline][dissect] Assembled dissect processor (connectorId=${connectorId})`
  );

  const simulationResult = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: {
        documents,
        processing: {
          steps: [
            {
              ...dissectResult,
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

  logger.debug(
    `[${streamName}][suggest_pipeline][dissect] Simulation complete (parsedRate=${parsedRate} connectorId=${connectorId})`
  );

  return {
    type: 'dissect',
    processor: dissectResult,
    parsedRate,
  };
}
