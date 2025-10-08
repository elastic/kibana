/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type {
  SignificantEventsGenerateResponse,
  SignificantEventsGetResponse,
  SignificantEventsPreviewResponse,
} from '@kbn/streams-schema';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { z } from '@kbn/zod';
import moment from 'moment';
import { from as fromRxjs, map, mergeMap } from 'rxjs';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { generateSignificantEventDefinitions } from '../../../lib/significant_events/generate_significant_events';
import { previewSignificantEvents } from '../../../lib/significant_events/preview_significant_events';
import { readSignificantEventsFromAlertsIndices } from '../../../lib/significant_events/read_significant_events_from_alerts_indices';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

// Make sure strings are expected for input, but still converted to a
// Date, without breaking the OpenAPI generator
const dateFromString = z.string().transform((input) => new Date(input));

const previewSignificantEventsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/significant_events/_preview 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({ from: dateFromString, to: dateFromString, bucketSize: z.string() }),
    body: z.object({
      query: z.object({
        kql: z.object({
          query: z.string(),
        }),
      }),
    }),
  }),
  options: {
    access: 'public',
    summary: 'Preview significant events',
    description: 'Preview significant event results based on a given query',
    availability: {
      since: '9.1.0',
      stability: 'experimental',
    },
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
  }): Promise<SignificantEventsPreviewResponse> => {
    const { streamsClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const isStreamEnabled = await streamsClient.isStreamsEnabled();
    if (!isStreamEnabled) {
      throw badRequest('Streams is not enabled');
    }

    const {
      body: { query },
      path: { name },
      query: { bucketSize, from, to },
    } = params;

    const definition = await streamsClient.getStream(name);

    return await previewSignificantEvents(
      {
        definition,
        bucketSize,
        from,
        to,
        query,
      },
      {
        scopedClusterClient,
      }
    );
  },
});

const readSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/significant_events 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      from: dateFromString,
      to: dateFromString,
      bucketSize: z.string(),
    }),
  }),

  options: {
    access: 'public',
    summary: 'Read the significant events',
    description: 'Read the significant events',
    availability: {
      since: '9.1.0',
      stability: 'experimental',
    },
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
    const { streamsClient, assetClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const { name } = params.path;
    const { from, to, bucketSize } = params.query;

    return await readSignificantEventsFromAlertsIndices(
      {
        name,
        from,
        to,
        bucketSize,
      },
      { assetClient, scopedClusterClient }
    );
  },
});

const durationSchema = z.string().transform((value) => {
  const match = value.match(/^(\d+)([mhd])$/);
  if (!match) {
    throw new Error('Duration must follow format: {number}{unit} where unit is m, h, or d');
  }

  const [, numberStr, unit] = match;
  const number = parseInt(numberStr, 10);

  // Map units to moment duration units
  const unitMap: Record<string, moment.unitOfTime.DurationConstructor> = {
    m: 'minute',
    h: 'hour',
    d: 'day',
  };

  const momentUnit = unitMap[unit];
  return moment.duration(number, momentUnit);
});

const generateSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/significant_events/_generate 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      connectorId: z.string(),
      currentDate: dateFromString.optional(),
      shortLookback: durationSchema.optional(),
      longLookback: durationSchema.optional(),
    }),
  }),
  options: {
    access: 'public',
    summary: 'Generate significant events',
    description: 'Generate significant events queries based on the stream data',
    availability: {
      since: '9.2.0',
      stability: 'experimental',
    },
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
    logger,
  }): Promise<SignificantEventsGenerateResponse> => {
    const { streamsClient, scopedClusterClient, licensing, inferenceClient, uiSettingsClient } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const definition = await streamsClient.getStream(params.path.name);

    return fromRxjs(
      generateSignificantEventDefinitions(
        {
          definition,
          connectorId: params.query.connectorId,
          currentDate: params.query.currentDate,
          shortLookback: params.query.shortLookback,
          longLookback: params.query.longLookback,
        },
        {
          inferenceClient,
          esClient: createTracedEsClient({
            client: scopedClusterClient.asCurrentUser,
            logger,
            plugin: 'streams',
          }),
          logger,
        }
      )
    ).pipe(
      mergeMap((queries) => fromRxjs(queries)),
      map((query) => ({
        query,
        type: 'generated_query' as const,
      }))
    );
  },
});

export const significantEventsRoutes = {
  ...readSignificantEventsRoute,
  ...previewSignificantEventsRoute,
  ...generateSignificantEventsRoute,
};
