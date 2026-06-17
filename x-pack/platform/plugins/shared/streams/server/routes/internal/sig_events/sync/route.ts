/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

/**
 * streamNames contract (optional body field):
 *   omitted / undefined → full global sweep (all streams)
 *   []                  → no-op
 *   [s1, s2, …]         → scoped sweep (only the listed streams)
 *
 * Returns a structured summary so the health signal (#5) can surface it.
 */
export const syncGroundednessRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_sync',
  options: {
    access: 'internal',
    summary: 'Sync query groundedness and sweep orphan rules',
    description:
      'Tombstones queries whose source features are gone and deletes orphaned Streams-owned rules.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z
      .object({
        streamNames: z.array(z.string()).optional(),
      })
      .optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ tombstonedQueries: number; sweptRules: number; errors: Array<{ stream: string; error: string }> }> => {
    const { getKnowledgeIndicatorClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const kiClient = await getKnowledgeIndicatorClient();
    const summary = await kiClient.syncGroundedness(params?.body?.streamNames);
    return summary;
  },
});

export const internalSyncRoutes = {
  ...syncGroundednessRoute,
};
