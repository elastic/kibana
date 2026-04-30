/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SignificantEventsGetResponse } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { readSignificantEventsFromAlertsIndices } from '../../../../lib/sig_events/read_significant_events_from_alerts_indices';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { searchModeSchema } from '../../../utils/search_mode';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const dateFromString = z.string().transform((input) => new Date(input));

const readAllSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_significant_events',
  params: z.object({
    query: z.object({
      from: dateFromString.describe('Start of the time range'),
      to: dateFromString.describe('End of the time range'),
      bucketSize: z.string().describe('Size of time buckets for aggregation'),
      query: z.string().optional().describe('Query string to filter significant events queries'),
      streamNames: z
        .union([z.string().transform((val) => [val]), z.array(z.string())])
        .optional()
        .describe('Stream names to filter significant events'),
      searchMode: searchModeSchema,
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
    const { getQueryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize, query, streamNames, searchMode } = params.query;

    const queryClient = await getQueryClient();
    return readSignificantEventsFromAlertsIndices(
      {
        from,
        to,
        bucketSize,
        query,
        streamNames,
        searchMode,
      },
      { queryClient, scopedClusterClient }
    );
  },
});

export const internalSignificantEventsRoutes = {
  ...readAllSignificantEventsRoute,
};
