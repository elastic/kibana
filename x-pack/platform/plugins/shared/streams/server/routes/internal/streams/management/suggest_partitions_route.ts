/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { partitionStream } from '@kbn/streams-ai';
import { Streams } from '@kbn/streams-schema';
import { from, map } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { createServerRoute } from '../../../create_server_route';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';

export interface SuggestPartitionsParams {
  path: {
    name: string;
  };
  body: {
    connector_id: string;
    start: number;
    end: number;
  };
}

export const suggestPartitionsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
    start: z.number(),
    end: z.number(),
  }),
}) satisfies z.Schema<SuggestPartitionsParams>;

type SuggestPartitionsResponse = Observable<
  ServerSentEventBase<
    'suggested_partitions',
    { partitions: Awaited<ReturnType<typeof partitionStream>> }
  >
>;

export const suggestPartitionsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_suggest_partitions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: suggestPartitionsSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<SuggestPartitionsResponse> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { inferenceClient, scopedClusterClient, streamsClient } = await getScopedClients({
      request,
    });

    const stream = await streamsClient.getStream(params.path.name);
    if (!Streams.ingest.all.Definition.is(stream)) {
      throw new StatusError('Partitioning suggestions are only available for ingest streams', 400);
    }

    const partitionsPromise = partitionStream({
      definition: stream,
      inferenceClient: inferenceClient.bindTo({ connectorId: params.body.connector_id }),
      esClient: scopedClusterClient.asCurrentUser,
      logger,
      start: params.body.start,
      end: params.body.end,
      maxSteps: 1, // Longer reasoning seems to add unnecessary conditions (and latency), instead of improving accuracy, so we limit the steps.
      signal: getRequestAbortSignal(request),
    });

    // Turn our promise into an Observable ServerSideEvent. The only reason we're streaming the
    // response here is to avoid timeout issues prevalent with long-running requests to LLMs.
    return from(partitionsPromise).pipe(
      map((partitions) => ({
        partitions,
        type: 'suggested_partitions' as const,
      }))
    );
  },
});
