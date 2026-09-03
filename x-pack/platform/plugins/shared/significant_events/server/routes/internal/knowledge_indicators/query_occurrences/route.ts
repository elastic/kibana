/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MAX_ID_LENGTH, type QueryOccurrencesResponse } from '@kbn/significant-events-schema';
import { MAX_STREAM_NAME_LENGTH } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { BUCKET_SIZE_PATTERN } from '../../../../lib/significant_events/helpers/fill_bucket_gaps';
import { createSignificantEventsTracedEsClient } from '../../../../lib/significant_events/create_significant_events_traced_es_client';
import { fetchQueryOccurrencesFromAlerts } from '../../../../lib/significant_events/fetch_query_occurrences_from_alerts';
import { SIGNIFICANT_EVENTS_API_PRIVILEGES } from '../../../../../common/constants';
import { searchModeSchema } from '../../../utils/search_mode';
import { assertValidDateRange, makeIsoDateFromString } from '../../../utils/iso_date_param';
import { resolveStreamNames } from '../../../utils/resolve_stream_names';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const dateFromString = makeIsoDateFromString('ISO 8601 datetime');

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
      rule_uuid: z
        .union([
          z
            .string()
            .max(MAX_ID_LENGTH)
            .transform((value) => [value]),
          z.array(z.string().max(MAX_ID_LENGTH)),
        ])
        .optional()
        .describe('Alerting rule UUIDs to include in the occurrence response'),
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
      requiredPrivileges: [SIGNIFICANT_EVENTS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    getSpaceId,
    server,
    logger,
  }): Promise<QueryOccurrencesResponse> => {
    const scopedClients = await getScopedClients({ request });
    const { scopedClusterClient, licensing } = scopedClients;
    await assertSignificantEventsAccess({ server, licensing });

    const esClient = createSignificantEventsTracedEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
    });
    const {
      from,
      to,
      bucketSize,
      query,
      streamNames,
      rule_uuid: ruleUuids,
      searchMode,
    } = params.query;
    assertValidDateRange(from, to);

    const resolvedStreamNames = await resolveStreamNames(streamNames, () =>
      scopedClients.streamsClient.listStreams()
    );

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
        streamNames: resolvedStreamNames,
        ruleUuids,
        searchMode,
        alertsReader,
        spaceId: await getSpaceId(request),
      },
      { kiClient, esClient }
    );
  },
});

export const internalKIQueryOccurrencesRoutes = {
  ...readQueryOccurrencesRoute,
};
