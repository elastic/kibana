/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnparsedEsqlResponse, createTracedEsClient } from '@kbn/traced-es-client';
import { z } from '@kbn/zod';
import { isNumber } from 'lodash';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { excludeFrozenQuery, kqlQuery, rangeQuery } from './query_helpers';

export const executeEsqlRoute = createServerRoute({
  endpoint: 'POST /internal/streams/esql',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
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
    const tracedEsClient = createTracedEsClient({
      client: scopedClusterClient.asCurrentUser,
      logger,
      plugin: 'streams',
    });

    const {
      body: { operationName, query, filter, kuery, start, end },
    } = params;

    const response = await tracedEsClient.esql(
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

export const internalEsqlRoutes = {
  ...executeEsqlRoute,
};
