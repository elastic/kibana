/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

export interface SourcesWithIndicatorsResponse {
  sources: Array<{ sourceId: string }>;
}

/**
 * Lists every source the sync sweep must reconcile in the current space (see
 * `getSourceIdsToReconcile`). Deliberately independent of the extraction
 * `_eligible` endpoint: the sweep runs regardless of extraction interval,
 * exclusions, or the continuous-extraction toggle. The response shape mirrors
 * the foreach idiom used by the managed sync workflow YAML. The path still says
 * `_streams_with_indicators`; the KI route prefix sweep (nightshift-program#1307)
 * renames it together with the workflow that calls it.
 */
export const sourcesWithIndicatorsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_knowledge_indicators/_streams_with_indicators',
  options: {
    access: 'internal',
    summary: 'List sources to reconcile',
    description:
      'Returns every source with an active knowledge indicator or a Nightshift-owned rule in the current space, used by the managed KI sync workflow to fan out reconciliation.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
    server,
  }): Promise<SourcesWithIndicatorsResponse> => {
    const { getKnowledgeIndicatorClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const kiClient = await getKnowledgeIndicatorClient();
    const sourceIds = await kiClient.getSourceIdsToReconcile();

    return { sources: sourceIds.map((sourceId) => ({ sourceId })) };
  },
});

export const syncRoutes = {
  ...sourcesWithIndicatorsRoute,
};
