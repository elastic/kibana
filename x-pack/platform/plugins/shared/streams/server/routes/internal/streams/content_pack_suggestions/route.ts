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
  ContentPackMatchingService,
  type ContentPackSuggestion,
} from '../../../../lib/streams/content_packs';

export const contentPackSuggestionsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/content_pack_suggestions',
  options: {
    access: 'internal',
    summary: 'Get content pack dashboard suggestions for a stream',
    description:
      'Finds dashboards from auto-installed Fleet content packages that match the stream based on dataset discovery mappings. Only works for classic streams (data stream format); wired streams will return empty results.',
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
  }): Promise<ContentPackSuggestion> => {
    const { streamsClient, soClient } = await getScopedClients({ request });

    const { name } = params.path;

    // Verify the stream exists
    await streamsClient.ensureStream(name);

    // Check if Fleet plugin is available
    const fleet = server.fleet;
    if (!fleet) {
      logger.debug('Fleet plugin not available, returning empty content pack suggestions');
      return {
        streamName: name,
        dataset: '',
        dashboards: [],
      };
    }

    const packageClient = fleet.packageService.asScoped(request);

    const contentPackMatchingService = new ContentPackMatchingService({
      logger: logger.get('content-packs'),
    });

    return contentPackMatchingService.getSuggestions(name, soClient, packageClient);
  },
});

export const internalContentPackSuggestionsRoutes = {
  ...contentPackSuggestionsRoute,
};
