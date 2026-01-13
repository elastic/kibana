/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type SignificantEventsGetResponse } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { from as toObservableFrom, map } from 'rxjs';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { readSignificantEventsFromAlertsIndices } from '../../../../lib/significant_events/read_significant_events_from_alerts_indices';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { generateSignificantEventsSummary } from '../../../../lib/significant_events/insights/generate_significant_events_summary';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';

// Make sure strings are expected for input, but still converted to a
// Date, without breaking the OpenAPI generator
const dateFromString = z.string().transform((input) => new Date(input));

const readAllSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_significant_events',
  params: z.object({
    query: z.object({
      from: dateFromString.describe('Start of the time range'),
      to: dateFromString.describe('End of the time range'),
      bucketSize: z.string().describe('Size of time buckets for aggregation'),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Read all significant events',
    description: 'Read all significant events',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<SignificantEventsGetResponse> => {
    const { queryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize } = params.query;

    return await readSignificantEventsFromAlertsIndices(
      {
        from,
        to,
        bucketSize,
      },
      { queryClient, scopedClusterClient }
    );
  },
});

type SignificantEventsSummaryEvent = ServerSentEventBase<
  'significant_events_summary',
  { summary: string; tokenUsage: { prompt: number; completion: number } }
>;

const generateSummaryRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_significant_events/_generate_summary',
  options: {
    access: 'internal',
    summary: 'Generate a summary of detected significant events',
    description: 'Generate a summary of detected significant events',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      connectorId: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<Observable<SignificantEventsSummaryEvent>> => {
    const {
      licensing,
      uiSettingsClient,
      inferenceClient,
      streamsClient,
      queryClient,
      scopedClusterClient,
    } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return toObservableFrom(
      generateSignificantEventsSummary({
        streamsClient,
        queryClient,
        esClient: scopedClusterClient.asCurrentUser,
        inferenceClient: inferenceClient.bindTo({ connectorId: params.query.connectorId }),
        signal: getRequestAbortSignal(request),
        logger,
      })
    ).pipe(
      map((result) => {
        return {
          type: 'significant_events_summary',
          ...result,
        };
      })
    );
  },
});

export const internalSignificantEventsRoutes = {
  ...readAllSignificantEventsRoute,
  ...generateSummaryRoute,
};
