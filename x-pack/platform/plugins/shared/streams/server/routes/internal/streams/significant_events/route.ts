/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type SignificantEventsGetResponse } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { readSignificantEventsFromAlertsIndices } from '../../../../lib/significant_events/read_significant_events_from_alerts_indices';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

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

export const internalSignificantEventsRoutes = {
  ...readAllSignificantEventsRoute,
};
