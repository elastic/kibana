/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsQueriesGenerationResult } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { generateKIQueries } from '../../../../lib/sig_events/ki_queries_generation_service';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';

const generateQueriesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/queries/_generate',
  params: z.object({
    path: z.object({
      streamName: z.string().describe('The name of the stream'),
    }),
    body: z
      .object({
        connectorId: z
          .string()
          .optional()
          .describe(
            'Optional connector ID override. When omitted the connector is resolved via the Inference Feature Registry.'
          ),
        maxExistingQueriesForContext: z
          .number()
          .optional()
          .describe('Max number of existing queries to include as context for the LLM.'),
      })
      .nullish(),
  }),
  options: {
    access: 'internal',
    summary: 'Generate significant events queries',
    description: 'Runs a single iteration of KI queries generation for the given stream.',
    timeout: { idleSocket: 600_000 },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
    telemetry,
  }): Promise<SignificantEventsQueriesGenerationResult> => {
    const {
      streamsClient,
      inferenceClient,
      soClient,
      getFeatureClient,
      getQueryClient,
      scopedClusterClient,
      licensing,
      uiSettingsClient,
    } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { streamName } = params.path;
    const { connectorId, maxExistingQueriesForContext } = params.body ?? {};

    const [featureClient, queryClient] = await Promise.all([getFeatureClient(), getQueryClient()]);

    const { queries, tokensUsed } = await generateKIQueries(
      { streamName, connectorId, maxExistingQueriesForContext },
      {
        streamsClient,
        inferenceClient,
        soClient,
        featureClient,
        queryClient,
        esClient: scopedClusterClient.asCurrentUser,
        uiSettingsClient,
        searchInferenceEndpoints: server.searchInferenceEndpoints,
        request,
        logger: logger.get('significant_events_queries_generation'),
        signal: getRequestAbortSignal(request),
        telemetry,
      }
    );

    return { queries, tokensUsed };
  },
});

export const internalGenerateQueriesRoutes = {
  ...generateQueriesRoute,
};
