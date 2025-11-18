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
import {
  type StreamlangDSL,
  type GrokProcessor,
  type DissectProcessor,
  grokProcessorSchema,
  dissectProcessorSchema,
} from '@kbn/streamlang';
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { createServerRoute } from '../../../create_server_route';
import { simulateProcessing } from '../processing/simulation_handler';

export interface SuggestIngestPipelineParams {
  path: {
    name: string;
  };
  body: {
    connector_id: string;
    start: number;
    end: number;
    documents: FlattenRecord[];
    parsing_processor: GrokProcessor | DissectProcessor;
  };
}

export const suggestIngestPipelineSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
    start: z.number(),
    end: z.number(),
    documents: z.array(flattenRecord),
    parsing_processor: z.discriminatedUnion('action', [
      grokProcessorSchema,
      dissectProcessorSchema,
    ]),
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

    const pipelinePromise = suggestProcessingPipeline({
      definition: stream,
      inferenceClient: inferenceClient.bindTo({ connectorId: params.body.connector_id }),
      esClient: scopedClusterClient.asCurrentUser,
      logger,
      start: params.body.start,
      end: params.body.end,
      parsingProcessor: params.body.parsing_processor,
      maxSteps: undefined, // Allow full reasoning for pipeline generation
      signal: abortController.signal,
      documents: params.body.documents,
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
