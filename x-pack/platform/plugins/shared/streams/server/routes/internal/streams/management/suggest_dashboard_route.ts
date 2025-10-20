/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Streams } from '@kbn/streams-schema';
import { suggestStreamDashboard } from '@kbn/streams-ai';
import { from, map } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { createServerRoute } from '../../../create_server_route';

export interface SuggestDashboardParams {
  path: {
    name: string;
  };
  body: {
    connector_id: string;
  };
}

export const suggestDashboardSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
  }),
}) satisfies z.Schema<SuggestDashboardParams>;

type SuggestDashboardResponse = Observable<
  ServerSentEventBase<
    'suggested_dashboard',
    { dashboard: Awaited<ReturnType<typeof suggestStreamDashboard>> }
  >
>;

export const suggestDashboardRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_suggest_dashboard',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: suggestDashboardSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<SuggestDashboardResponse> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { inferenceClient, scopedClusterClient, streamsClient, featureClient } =
      await getScopedClients({
        request,
      });

    const stream = await streamsClient.getStream(params.path.name);

    const features = await featureClient.getFeatures(params.path.name);

    if (!Streams.ingest.all.Definition.is(stream)) {
      throw new Error(`Stream ${stream.name} is not a valid ingest stream`);
    }

    const dashboardPromise = suggestStreamDashboard({
      definition: stream,
      features: features.hits,
      inferenceClient: inferenceClient.bindTo({ connectorId: params.body.connector_id }),
      esClient: scopedClusterClient.asCurrentUser,
      logger,
      maxSteps: 10, // Dashboard creation may require more exploration steps than partitioning
      signal: new AbortController().signal,
    });

    // Turn our promise into an Observable ServerSideEvent. The only reason we're streaming the
    // response here is to avoid timeout issues prevalent with long-running requests to LLMs.
    return from(dashboardPromise).pipe(
      map((dashboard) => ({
        dashboard,
        type: 'suggested_dashboard' as const,
      }))
    );
  },
});
