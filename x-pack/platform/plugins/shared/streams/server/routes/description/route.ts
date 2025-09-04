/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createTracedEsClient } from '@kbn/traced-es-client';
import { z } from '@kbn/zod';
import { from as fromRxjs, map } from 'rxjs';
import type { IdentifiedSystemGenerateResponse } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { identifySystemDescription } from '../../lib/significant_events/identify_system_description';
import { createServerRoute } from '../create_server_route';
import { dateFromString, durationSchema } from '../significant_events/route';
import { assertEnterpriseLicense } from '../utils/assert_enterprise_license';

const generateDescriptionRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/description/_generate 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      connectorId: z.string(),
      currentDate: dateFromString.optional(),
      shortLookback: durationSchema.optional(),
    }),
  }),
  options: {
    access: 'public',
    summary: 'identify the stream description using LLM',
    description: 'identify the stream description using LLM',
    availability: {
      since: '9.2.0',
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
    logger,
  }): Promise<IdentifiedSystemGenerateResponse> => {
    const { streamsClient, scopedClusterClient, licensing, inferenceClient } =
      await getScopedClients({
        request,
      });
    await assertEnterpriseLicense(licensing);
    await streamsClient.ensureStream(params.path.name);

    const definition = await streamsClient.getStream(params.path.name);

    return fromRxjs(
      identifySystemDescription(
        {
          name: params.path.name,
          connectorId: params.query.connectorId,
          currentDate: params.query.currentDate,
          shortLookback: params.query.shortLookback,
          definition,
        },
        {
          inferenceClient,
          esClient: createTracedEsClient({
            client: scopedClusterClient.asCurrentUser,
            logger,
            plugin: 'streams',
          }),
          logger,
        }
      )
    ).pipe(
      map((description) => ({
        description,
        type: 'identified_system' as const,
      }))
    );
  },
});

export const descriptionRoutes = {
  ...generateDescriptionRoute,
};
