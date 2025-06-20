/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { z } from '@kbn/zod';
import type { SignificantEventsGetResponse } from '@kbn/streams-schema';
import { SecurityError } from '../../../lib/streams/errors/security_error';
import {
  STREAMS_API_PRIVILEGES,
  STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE,
} from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { readSignificantEvents } from './read_significant_events';
import { assertEnterpriseLicense } from '../../utils/assert_enterprise_license';

export const readSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/significant_events 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({ from: z.coerce.date(), to: z.coerce.date(), bucketSize: z.string() }),
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

    return await readSignificantEvents(
      { name, from, to, bucketSize },
      { assetClient, scopedClusterClient }
    );
  },
});

export const significantEventsRoutes = {
  ...readSignificantEventsRoute,
};
