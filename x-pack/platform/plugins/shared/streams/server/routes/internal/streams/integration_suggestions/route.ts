/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createServerRoute } from '../../../create_server_route';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import {
  IntegrationSuggestionService,
  type IntegrationSuggestionsResult,
} from '../../../../lib/streams/integration_suggestions';

export const integrationSuggestionsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/integration_suggestions',
  options: {
    access: 'internal',
    summary: 'Get integration suggestions for a stream',
    description:
      'Suggests Fleet integration packages based on detected features (entities and technologies) in the stream. Only returns suggestions for features with confidence >= 80%. Includes OTel receiver config snippets when available.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<IntegrationSuggestionsResult> => {
    const { streamsClient, featureClient } = await getScopedClients({ request });

    const { name } = params.path;

    // Verify the stream exists
    await streamsClient.ensureStream(name);

    // Get the package client from Fleet if available
    const fleet = server.fleet;
    const packageClient = fleet?.packageService.asScoped(request);

    if (!packageClient) {
      logger.debug('Fleet plugin not available, returning suggestions without package verification');
    }

    const integrationSuggestionService = new IntegrationSuggestionService({
      logger: logger.get('integration-suggestions'),
    });

    return integrationSuggestionService.getSuggestions(name, featureClient, packageClient);
  },
});

export const internalIntegrationSuggestionsRoutes = {
  ...integrationSuggestionsRoute,
};
