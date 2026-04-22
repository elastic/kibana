/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { queryTypeSchema } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import type { PersistQueriesResult } from '../../../../lib/sig_events/persist_queries';
import { persistQueries } from '../../../../lib/sig_events/persist_queries';

const persistQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/queries/_persist',
  params: z.object({
    path: z.object({
      streamName: z.string().describe('The name of the stream'),
    }),
    body: z.object({
      queries: z.array(
        z.object({
          type: queryTypeSchema,
          title: z.string(),
          esql: z.object({ query: z.string() }),
          severity_score: z.number(),
          description: z.string(),
          evidence: z.array(z.string()).optional(),
          replaces: z.string().optional(),
        })
      ),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Persist generated queries with deduplication',
    description:
      'Persists generated significant event queries for a stream, deduplicating by ES|QL and handling rule-backed replacements.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({ params, request, getScopedClients, server }): Promise<PersistQueriesResult> => {
    const { streamsClient, getQueryClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { streamName } = params.path;
    const { queries } = params.body;
    const queryClient = await getQueryClient();

    return persistQueries(streamName, queries, { queryClient, streamsClient });
  },
});

export const internalPersistQueriesRoutes = {
  ...persistQueriesRoute,
};
