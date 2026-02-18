/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { suggestProcessingPipeline, type SuggestProcessingPipelineResult } from '@kbn/streams-ai';
import { from, map, catchError } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import { createSSEInternalError } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import {
  Streams,
  type FlattenRecord,
  flattenRecord,
  getStreamTypeFromDefinition,
} from '@kbn/streams-schema';
import { type StreamlangDSL, type GrokProcessor, type DissectProcessor } from '@kbn/streamlang';
import type { InferenceClient } from '@kbn/inference-common';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
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
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
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
          nodes: Array<{ pattern: string } | { id: string; component: string; values: string[] }>;
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
    logger.debug('[suggest_pipeline] Request received');
    logger.debug(
      `[suggest_pipeline] extracted_patterns: grok=${Boolean(
        params.body.extracted_patterns?.grok
      )} dissect=${Boolean(params.body.extracted_patterns?.dissect)}`
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
              `[suggest_pipeline] (parallel) scheduling grok patternGroups=${grok.patternGroups.length} fieldName=${grok.fieldName}`
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
              }).catch((error) => {
                if (isNoLLMSuggestionsError(error)) {
                  logger.debug('[suggest_pipeline] No LLM suggestions available for grok');
                  return null;
                }
                throw error;
              })
            );
          }
          if (dissect) {
            logger.debug(
              `[suggest_pipeline] (parallel) scheduling dissect messages=${dissect.messages.length} fieldName=${dissect.fieldName}`
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
              }).catch((error) => {
                if (isNoLLMSuggestionsError(error)) {
                  logger.debug('[suggest_pipeline] No LLM suggestions available for dissect');
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
            logger.debug(`[suggest_pipeline] Candidate type=${c.type} parsedRate=${c.parsedRate}`)
          );
          if (candidates.length > 0) {
            candidates.sort((a, b) => b.parsedRate - a.parsedRate);
            logger.debug(
              `[suggest_pipeline] Selected processor type=${candidates[0].type} parsedRate=${candidates[0].parsedRate}`
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
              scopedClusterClient,
              streamsClient,
              fieldsMetadataClient,
            }),
        });

        const durationMs = Date.now() - startTime;

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
          logger.debug('No LLM suggestions available for pipeline generation');
          // Return null pipeline instead of error - frontend will handle this gracefully
          return [
            {
              type: 'suggested_processing_pipeline' as const,
              pipeline: null,
            },
          ];
        }
        logger.error('Failed to generate pipeline suggestion:', error);
        // Convert error to SSE error event so it's sent to client with full message
        throw createSSEInternalError(error.message || 'Failed to generate pipeline suggestion');
      })
    );
  },
});

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
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: any;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
  logger: any;
}): Promise<{ type: 'grok'; processor: GrokProcessor; parsedRate: number } | null> {
  const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

  // Request grok pattern reviews for each group in parallel
  const grokResults = await Promise.allSettled(
    patternGroups.map(async (group) => {
      logger.debug(`[suggest_pipeline][grok] Reviewing group messages=${group.messages.length}`);
      // Call LLM to review patterns directly
      const patterns = group.nodes
        .filter((node): node is { pattern: string } => 'pattern' in node)
        .map((node) => node.pattern);
      logger.debug(`[suggest_pipeline][grok] Derived patterns=${patterns.length}`);

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
      logger.debug('[suggest_pipeline][grok] LLM review response received');

      const grokProcessorResult = getGrokProcessor(
        patterns.map((pattern) => ({ pattern })),
        grokProcessor
      );
      logger.debug(
        `[suggest_pipeline][grok] getGrokProcessor produced patterns=${grokProcessorResult.patterns.length}`
      );

      return grokProcessorResult;
    })
  );

  // Collect successful results
  const grokProcessors = grokResults.reduce<GrokProcessorResult[]>((acc, result) => {
    if (result.status === 'fulfilled') {
      acc.push(result.value);
    } else {
      logger.error('[suggest_pipeline][grok] LLM review failed:', result.reason);
      // Don't re-throw - allow partial success
    }
    return acc;
  }, []);

  if (grokProcessors.length === 0) {
    return null;
  }

  // Merge all grok processors into one
  const combinedGrokProcessor = mergeGrokProcessors(grokProcessors);

  // Filter out empty patterns that may come from the heuristics library
  const filteredPatterns = combinedGrokProcessor.patterns.filter(
    (pattern) => pattern.trim().length > 0
  );

  // If all patterns were empty, return null
  if (filteredPatterns.length === 0) {
    logger.debug(
      '[suggest_pipeline][grok] All patterns were empty after filtering out empty string patterns'
    );
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
              action: 'grok',
              customIdentifier: SUGGESTED_GROK_PROCESSOR_ID,
              from: fieldName,
              patterns: filteredPatterns,
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
      patterns: filteredPatterns as [string, ...string[]],
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
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: any;
  fieldsMetadataClient: IFieldsMetadataClient;
  signal: AbortSignal;
  logger: any;
}): Promise<{ type: 'dissect'; processor: DissectProcessor; parsedRate: number } | null> {
  const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

  if (messages.length === 0) {
    return null;
  }

  // Extract dissect pattern on server-side
  logger.debug('[suggest_pipeline][dissect] Grouping messages by pattern');
  const grouped = groupMessagesByDissectPattern(messages);
  if (grouped.length === 0) {
    logger.debug('[suggest_pipeline][dissect] No patterns found in messages');
    return null;
  }

  const largestGroup = grouped[0];
  logger.debug(
    `[suggest_pipeline][dissect] Extracting pattern from largest group messages=${largestGroup.messages.length}`
  );
  const dissectPattern = extractDissectPattern(largestGroup.messages);

  if (!dissectPattern.ast.nodes.length) {
    logger.debug('[suggest_pipeline][dissect] No AST nodes in extracted pattern');
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
    logger.debug('[suggest_pipeline][dissect] Empty pattern generated; skipping simulation');
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
