/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { SIGNIFICANT_EVENTS_API_PRIVILEGES } from '../../../../common/constants';

export interface StreamsWithIndicatorsResponse {
  streams: Array<{ streamName: string }>;
}

/**
 * Lists every stream the sync sweep must reconcile (see
 * `getStreamNamesToReconcile`). Deliberately independent of the extraction
 * `_eligible` endpoint: the sweep runs regardless of extraction interval,
 * exclusions, or the continuous-extraction toggle. The response shape mirrors
 * the foreach idiom used by the managed sync workflow YAML.
 */
export const streamsWithIndicatorsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_knowledge_indicators/_streams_with_indicators',
  options: {
    access: 'internal',
    summary: 'List streams to reconcile',
    description:
      'Returns every stream with an active knowledge indicator or a Streams-owned rule, used by the managed KI sync workflow to fan out reconciliation.',
  },
  security: {
    authz: {
      requiredPrivileges: [SIGNIFICANT_EVENTS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
    server,
  }): Promise<StreamsWithIndicatorsResponse> => {
    const { getKnowledgeIndicatorClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const kiClient = await getKnowledgeIndicatorClient();
    const streamNames = await kiClient.getStreamNamesToReconcile();

    return { streams: streamNames.map((streamName) => ({ streamName })) };
  },
});

export const syncRoutes = {
  ...streamsWithIndicatorsRoute,
};
