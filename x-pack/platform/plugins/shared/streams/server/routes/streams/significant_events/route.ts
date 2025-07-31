/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import {
  SignificantEventsGetResponse,
  SignificantEventsPreviewResponse,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { SecurityError } from '../../../lib/streams/errors/security_error';
import {
  STREAMS_API_PRIVILEGES,
  STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE,
} from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { previewSignificantEvents } from './preview_significant_events';
import { readSignificantEventsFromAlertsIndices } from './read_significant_events_from_alerts_indices';
import { assertEnterpriseLicense } from '../../utils/assert_enterprise_license';

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
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(
      STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id
    );
    if (!isAvailableForTier) {
      throw new SecurityError(`Cannot access API on the current pricing tier`);
    }

    const { streamsClient, scopedClusterClient } = await getScopedClients({
      request,
    });

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
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(
      STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id
    );
    if (!isAvailableForTier) {
      throw new SecurityError(`Cannot access API on the current pricing tier`);
    }

    const { streamsClient, assetClient, scopedClusterClient, licensing } = await getScopedClients({
      request,
    });
    await assertEnterpriseLicense(licensing);

    const isStreamEnabled = await streamsClient.isStreamsEnabled();
    if (!isStreamEnabled) {
      throw badRequest('Streams are not enabled');
    }

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

export const significantEventsRoutes = {
  ...readSignificantEventsRoute,
  ...previewSignificantEventsRoute,
};
