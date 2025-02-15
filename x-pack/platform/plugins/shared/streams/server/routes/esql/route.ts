/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import {
  UnparsedEsqlResponse,
  createObservabilityEsClient,
} from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { z } from '@kbn/zod';
import { isNumber } from 'lodash';
import { createServerRoute } from '../create_server_route';

export const executeEsqlRoute = createServerRoute({
  endpoint: 'POST /internal/streams/esql',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: z.object({
    body: z.object({
      query: z.string(),
      operationName: z.string(),
      filter: z.object({}).passthrough().optional(),
      kuery: z.string().optional(),
      start: z.number().optional(),
      end: z.number().optional(),
    }),
  }),
  handler: async ({ params, request, logger, getScopedClients }): Promise<UnparsedEsqlResponse> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const observabilityEsClient = createObservabilityEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
      plugin: 'streams',
    });

    const {
      body: { operationName, query, filter, kuery, start, end },
    } = params;

    const response = await observabilityEsClient.esql(
      operationName,
      {
        query,
        filter: {
          bool: {
            filter: [
              filter || { match_all: {} },
              ...kqlQuery(kuery),
              ...excludeFrozenQuery(),
              ...(isNumber(start) && isNumber(end) ? rangeQuery(start, end) : []),
            ],
          },
        },
      },
      { transform: 'none' }
    );

    return response;
  },
});

export const esqlRoutes = {
  ...executeEsqlRoute,
};
