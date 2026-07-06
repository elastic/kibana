/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryOccurrencesResponse } from '@kbn/significant-events-schema';
import { MAX_STREAM_NAME_LENGTH } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { BUCKET_SIZE_PATTERN } from '../../../../../lib/significant_events/helpers/fill_bucket_gaps';
import { fetchQueryOccurrencesFromAlerts } from '../../../../../lib/significant_events/fetch_query_occurrences_from_alerts';
import { STREAMS_API_PRIVILEGES } from '../../../../../../common/constants';
import { searchModeSchema } from '../../../../utils/search_mode';
import { createServerRoute } from '../../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../../utils/assert_significant_events_access';

// Make sure strings are expected for input, but still converted to a
// Date, without breaking the OpenAPI generator
const dateFromString = z
  .string()
  .max(100)
  .transform((input) => new Date(input));

const readQueryOccurrencesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_query_occurrences',
  params: z.object({
    query: z.object({
      from: dateFromString.describe('Start of the time range'),
      to: dateFromString.describe('End of the time range'),
      bucketSize: z
        .string()
        .max(20)
        .regex(BUCKET_SIZE_PATTERN)
        .describe('Size of time buckets for aggregation'),
      query: z.string().max(4096).optional().describe('Query string to filter stream queries'),
      streamNames: z
        .union([
          z
            .string()
            .max(MAX_STREAM_NAME_LENGTH)
            .transform((val) => [val]),
          z.array(z.string().max(MAX_STREAM_NAME_LENGTH)),
        ])
        .optional()
        .describe('Stream names to filter results by'),
      searchMode: searchModeSchema,
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Read query occurrences',
    description: 'Read query occurrences',
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
  }): Promise<QueryOccurrencesResponse> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing, uiSettingsClient } = scopedClients;
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize, query, streamNames, searchMode } = params.query;

    const [kiClient, { alertsReader }] = await Promise.all([
      scopedClients.getKnowledgeIndicatorClient(),
      scopedClients.getSignificantEventsAlertingContext(),
    ]);
    return fetchQueryOccurrencesFromAlerts(
      {
        from,
        to,
        bucketSize,
        query,
        streamNames,
        searchMode,
        alertsReader,
      },
      { kiClient, scopedClusterClient }
    );
  },
});

export const internalSignificantEventsKIQueryOccurrencesRoutes = {
  ...readQueryOccurrencesRoute,
};
