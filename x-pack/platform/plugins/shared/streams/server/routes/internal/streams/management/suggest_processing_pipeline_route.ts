/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Streams } from '@kbn/streams-schema';
import { suggestProcessingPipeline } from '@kbn/streams-ai';
import { from, map } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { type FlattenRecord, flattenRecord } from '@kbn/streams-schema';
import { type StreamlangDSL, type GrokProcessor, type DissectProcessor } from '@kbn/streamlang';
import type { InferenceClient } from '@kbn/inference-common';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import {
  getGrokProcessor,
  getReviewFields as getGrokReviewFields,
  mergeGrokProcessors,
  unwrapPatternDefinitions,
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
import { createServerRoute } from '../../../create_server_route';
import { simulateProcessing } from '../processing/simulation_handler';
import { handleProcessingGrokSuggestions } from '../processing/grok_suggestions_handler';
import { handleProcessingDissectSuggestions } from '../processing/dissect_suggestions_handler';

export interface SuggestIngestPipelineParams {
  path: {
    name: string;
  };
  body: {
    connector_id: string;
    documents: FlattenRecord[];
    extracted_patterns: {
      grok: {
        fieldName: string;
        patternGroups: Array<{
          messages: string[];
          patterns: string[];
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
              patterns: z.array(z.string()),
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
    { pipeline: Awaited<ReturnType<typeof suggestProcessingPipeline>> }
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
  }): Promise<SuggestProcessingPipelineResponse> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { inferenceClient, scopedClusterClient, streamsClient, fieldsMetadataClient } =
      await getScopedClients({
        request,
      });

    const stream = await streamsClient.getStream(params.path.name);

    if (!Streams.ingest.all.Definition.is(stream)) {
      throw new Error(`Stream ${stream.name} is not a valid ingest stream`);
    }

    const abortController = new AbortController();

    // Process extracted patterns from client to determine best parsing processor
    let parsingProcessor: GrokProcessor | DissectProcessor | undefined;

    if (params.body.extracted_patterns) {
      const { grok, dissect } = params.body.extracted_patterns;
      const candidates: Array<{
        type: 'grok' | 'dissect';
        processor: GrokProcessor | DissectProcessor;
        parsedRate: number;
      }> = [];

      // Process grok patterns if provided
      if (grok) {
        try {
          const grokProcessor = await processGrokPatterns({
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
          });
          if (grokProcessor) {
            candidates.push(grokProcessor);
          }
        } catch (error) {
          logger.warn('Grok pattern processing failed:', error);
        }
      }

      // Process dissect pattern if provided
      if (dissect) {
        try {
          const dissectProcessor = await processDissectPattern({
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
          });
          if (dissectProcessor) {
            candidates.push(dissectProcessor);
          }
        } catch (error) {
          logger.warn('Dissect pattern processing failed:', error);
        }
      }

      // Pick the best processor based on parsed rate
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.parsedRate - a.parsedRate);
        parsingProcessor = candidates[0].processor;
      }
    }

    const pipelinePromise = suggestProcessingPipeline({
      definition: stream,
      inferenceClient: inferenceClient.bindTo({ connectorId: params.body.connector_id }),
      parsingProcessor,
      maxSteps: undefined, // Allow full reasoning for pipeline generation
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

    // Turn our promise into an Observable ServerSideEvent. The only reason we're streaming the
    // response here is to avoid timeout issues prevalent with long-running requests to LLMs.
    return from(pipelinePromise).pipe(
      map((pipeline) => ({
        type: 'suggested_processing_pipeline' as const,
        pipeline,
      }))
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
  patternGroups: Array<{ messages: string[]; patterns: string[] }>;
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
      // Call LLM to review patterns directly
      const grokProcessor = await handleProcessingGrokSuggestions({
        params: {
          path: { name: streamName },
          body: {
            connector_id: connectorId,
            sample_messages: group.messages,
            review_fields: getGrokReviewFields(
              group.patterns.map((pattern) => ({ pattern })),
              10
            ),
          },
        },
        inferenceClient,
        scopedClusterClient,
        streamsClient,
        fieldsMetadataClient,
        signal,
        logger,
      });

      const grokProcessorResult = getGrokProcessor(
        group.patterns.map((pattern) => ({ pattern })),
        grokProcessor
      );

      return {
        ...grokProcessorResult,
        patterns: unwrapPatternDefinitions(grokProcessorResult),
        pattern_definitions: {},
      };
    })
  );

  // Collect successful results
  const grokProcessors = grokResults.reduce<GrokProcessorResult[]>((acc, result) => {
    if (result.status === 'fulfilled') {
      acc.push(result.value);
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
 * Process dissect pattern extracted client-side:
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

  // Extract dissect pattern from messages (server-side)
  const groupedMessages = groupMessagesByDissectPattern(messages);
  const largestGroup = groupedMessages[0]; // Groups are sorted by probability (descending)

  if (!largestGroup || largestGroup.messages.length === 0) {
    return null;
  }

  const dissectPattern = extractDissectPattern(largestGroup.messages);

  if (dissectPattern.fields.length === 0) {
    return null;
  }

  // Call LLM to review and map fields to ECS
  const dissectReview = await handleProcessingDissectSuggestions({
    params: {
      path: { name: streamName },
      body: {
        connector_id: connectorId,
        sample_messages: largestGroup.messages.slice(0, 10),
        review_fields: getDissectReviewFields(dissectPattern, 10),
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

  // Run simulation to verify dissect pattern works
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
              pattern: dissectProcessor.pattern,
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
      pattern: dissectProcessor.pattern,
    },
    parsedRate,
  };
}
