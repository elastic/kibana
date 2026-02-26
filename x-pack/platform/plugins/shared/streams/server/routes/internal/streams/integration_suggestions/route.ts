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
  FleetPackageSearchProvider,
  type IntegrationSuggestionsResult,
} from '../../../../lib/streams/integration_suggestions';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';

export const integrationSuggestionsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/integration_suggestions',
  options: {
    access: 'internal',
    summary: 'Get integration suggestions for a stream',
    description:
      'Suggests Fleet integration packages based on detected features (entities and technologies) in the stream. Only returns suggestions for features with confidence >= 80%. When a connector_id is provided, uses AI-based reasoning to match features to integrations. Otherwise falls back to static mapping.',
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
    body: z
      .object({
        connector_id: z.string().optional(),
      })
      .optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<IntegrationSuggestionsResult> => {
    const { streamsClient, featureClient, inferenceClient } = await getScopedClients({ request });

    const { name } = params.path;
    const connectorId = params.body?.connector_id;

    // Verify the stream exists
    await streamsClient.ensureStream(name);

    // Get the package client from Fleet if available
    const fleet = server.fleet;
    const packageClient = fleet?.packageService.asScoped(request);

    if (!packageClient) {
      logger.debug('Fleet plugin not available, returning suggestions without package verification');
    }

    const serviceLogger = logger.get('integration-suggestions');

    // Create package search provider if package client is available
    const packageSearchProvider = packageClient
      ? new FleetPackageSearchProvider({
          packageClient,
          logger: serviceLogger,
        })
      : undefined;

    // Create bound inference client if connector_id provided
    const boundInferenceClient = connectorId
      ? inferenceClient.bindTo({ connectorId })
      : undefined;

    const integrationSuggestionService = new IntegrationSuggestionService({
      logger: serviceLogger,
    });

    return integrationSuggestionService.getSuggestions({
      streamName: name,
      featureClient,
      packageClient,
      inferenceClient: boundInferenceClient,
      packageSearchProvider,
      signal: getRequestAbortSignal(request),
    });
  },
});

export const internalIntegrationSuggestionsRoutes = {
  ...integrationSuggestionsRoute,
};
