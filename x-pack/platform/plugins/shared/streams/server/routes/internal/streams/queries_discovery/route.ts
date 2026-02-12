/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SignificantEventsResponse } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { readSignificantEventsFromAlertsIndices } from '../../../../lib/significant_events/read_significant_events_from_alerts_indices';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

interface DiscoveryQueriesGetResponse {
  queries: SignificantEventsResponse[];
  page: number;
  perPage: number;
  total: number;
}

interface DiscoveryQueriesOccurrencesGetResponse {
  aggregated_occurrences: Array<{ x: string; y: number }>;
  total_occurrences: number;
}

// Make sure strings are expected for input, but still converted to a
// Date, without breaking the OpenAPI generator
const dateFromString = z.string().transform((input) => new Date(input));

const streamNamesSchema = z
  .preprocess((val) => (typeof val === 'string' ? [val] : val), z.array(z.string()).optional())
  .describe('Stream names to filter significant events');

const commonQuerySchema = z.object({
  from: dateFromString.describe('Start of the time range'),
  to: dateFromString.describe('End of the time range'),
  bucketSize: z.string().describe('Size of time buckets for aggregation'),
  query: z.string().optional().describe('Query string to filter significant events queries'),
  streamNames: streamNamesSchema,
});

const sortSignificantEventsForQueriesTable = (
  significantEvents: SignificantEventsResponse[]
): SignificantEventsResponse[] => {
  // Keep behavior consistent with the current UI sorting:
  // - backed first
  // - higher severity_score first
  // - title ascending
  return [...significantEvents].sort((a, b) => {
    const backedA = a.rule_backed ? 1 : 0;
    const backedB = b.rule_backed ? 1 : 0;
    if (backedA !== backedB) return backedB - backedA;

    const scoreA = a.severity_score ?? Number.NEGATIVE_INFINITY;
    const scoreB = b.severity_score ?? Number.NEGATIVE_INFINITY;
    if (scoreA !== scoreB) return scoreB - scoreA;

    return (a.title ?? '').localeCompare(b.title ?? '');
  });
};

const getDiscoveryQueriesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries',
  params: z.object({
    query: commonQuerySchema.extend({
      page: z.coerce.number().int().min(1).optional().describe('Page number (1-based)'),
      perPage: z.coerce
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of items per page'),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Read paginated significant-event queries for the discovery table',
    description: 'Returns significant-event queries as table rows, with server-side pagination.',
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
  }): Promise<DiscoveryQueriesGetResponse> => {
    const { queryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize, query, streamNames, page = 1, perPage = 10 } = params.query;

    const { significant_events: significantEvents } = await readSignificantEventsFromAlertsIndices(
      {
        from,
        to,
        bucketSize,
        query,
        streamNames,
      },
      { queryClient, scopedClusterClient }
    );

    const sorted = sortSignificantEventsForQueriesTable(significantEvents);
    const total = sorted.length;
    const start = (page - 1) * perPage;
    const queries = start >= total ? [] : sorted.slice(start, start + perPage);

    return { queries, page, perPage, total };
  },
});

const getDiscoveryQueriesOccurrencesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_queries/_occurrences',
  params: z.object({
    query: commonQuerySchema,
  }),
  options: {
    access: 'internal',
    summary: 'Read aggregated occurrences for the discovery histogram',
    description:
      'Returns the aggregated occurrences histogram series for the chart above the queries table.',
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
  }): Promise<DiscoveryQueriesOccurrencesGetResponse> => {
    const { queryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize, query, streamNames } = params.query;

    const { aggregated_occurrences: aggregatedOccurrenceBuckets } =
      await readSignificantEventsFromAlertsIndices(
        {
          from,
          to,
          bucketSize,
          query,
          streamNames,
        },
        { queryClient, scopedClusterClient }
      );

    const aggregatedOccurrences = aggregatedOccurrenceBuckets.map((bucket) => ({
      x: bucket.date,
      y: bucket.count,
    }));

    const totalOccurrences = aggregatedOccurrenceBuckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0
    );

    return { aggregated_occurrences: aggregatedOccurrences, total_occurrences: totalOccurrences };
  },
});

export const internalDiscoveryQueriesRoutes = {
  ...getDiscoveryQueriesRoute,
  ...getDiscoveryQueriesOccurrencesRoute,
};
