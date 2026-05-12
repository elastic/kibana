/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { partitionStream } from '@kbn/streams-ai';
import { Streams } from '@kbn/streams-schema';
import { conditionSchema } from '@kbn/streamlang';
import { from, map } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { createServerRoute } from '../../../create_server_route';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { assertMlTierAccess } from '../../../utils/assert_ml_tier_access';

export interface SuggestPartitionsParams {
  path: {
    name: string;
  };
  body: {
    connector_id: string;
    start: number;
    end: number;
    user_prompt?: string;
    /**
     * Partitions that were suggested in a prior call but have not yet been
     * applied to the stream. Pass these when iterating on suggestions
     * (e.g. "give me different ones"). The stream's *real* existing
     * children are fetched server-side from the stream definition — do
     * NOT pass them here.
     */
    previous_suggestions?: Array<{ name: string; condition: z.infer<typeof conditionSchema> }>;
  };
}

/**
 * Outer cap on the [start, end] window the caller can request. The inner
 * `partitionStream` workflow does its own 7-day clamp on the *effective*
 * clustering window (anchored at the latest unrouted document), but it
 * still issues 1-2 ES aggregation queries against the user-supplied range
 * to discover that anchor. Without an outer cap, an adversarial caller
 * (this is an internal route under the broad `read` privilege) could pin
 * `end - start` to e.g. epoch-since-1970, forcing those discovery queries
 * over arbitrary spans. One year is far wider than any legitimate UI
 * picker would produce and still leaves comfortable headroom for backfill
 * scenarios.
 */
const MAX_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

export const suggestPartitionsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z
    .object({
      connector_id: z.string(),
      start: z.number().int().nonnegative(),
      end: z.number().int().nonnegative(),
      user_prompt: z.string().max(2000).optional(),
      previous_suggestions: z
        .array(z.object({ name: z.string(), condition: conditionSchema }))
        .optional(),
    })
    .refine(({ start, end }) => start < end, {
      message: '`start` must be strictly less than `end`',
      path: ['end'],
    })
    .refine(({ start, end }) => end - start <= MAX_WINDOW_MS, {
      message: `time window (\`end - start\`) must not exceed ${MAX_WINDOW_MS}ms (~365 days)`,
      path: ['end'],
    }),
}) satisfies z.Schema<SuggestPartitionsParams>;

type SuggestPartitionsResponse = Observable<
  ServerSentEventBase<'suggested_partitions', Awaited<ReturnType<typeof partitionStream>>>
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
    assertMlTierAccess({ server });

    const { inferenceClient, scopedClusterClient, streamsClient, getFeatureClient } =
      await getScopedClients({
        request,
      });

    const { connector_id: connectorId } = params.body;

    const stream = await streamsClient.getStream(params.path.name);
    if (!Streams.WiredStream.Definition.is(stream)) {
      throw new StatusError('Partitioning suggestions are only available for wired streams', 400);
    }

    const partitionsPromise = partitionStream({
      definition: stream,
      inferenceClient: inferenceClient.bindTo({ connectorId }),
      esClient: scopedClusterClient.asCurrentUser,
      logger,
      start: params.body.start,
      end: params.body.end,
      maxSteps: 4, // Longer reasoning seems to add unnecessary conditions (and latency), instead of improving accuracy, so we limit the steps.
      signal: getRequestAbortSignal(request),
      userPrompt: params.body.user_prompt,
      previousSuggestions: params.body.previous_suggestions,
      getFeatures: async (filters) => {
        const featureClient = await getFeatureClient();
        const { hits } = await featureClient.getFeatures(params.path.name, filters);
        return hits;
      },
    });

    // Turn our promise into an Observable ServerSideEvent. The only reason we're streaming the
    // response here is to avoid timeout issues prevalent with long-running requests to LLMs.
    return from(partitionsPromise).pipe(
      map((suggestions) => ({
        ...suggestions,
        type: 'suggested_partitions' as const,
      }))
    );
  },
});
