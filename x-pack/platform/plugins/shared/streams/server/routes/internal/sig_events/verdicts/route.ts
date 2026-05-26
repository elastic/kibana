/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { verdictSchema, type Verdict } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type { PaginatedResponse } from '../../../../lib/sig_events/query_utils';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const verdictsSearchRoute = createServerRoute({
  endpoint: 'GET /internal/sig_events/verdicts',
  options: {
    access: 'internal',
    summary: 'Get latest verdicts',
    description: 'Search verdict entities using their latest derived state with pagination.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(1000).optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<PaginatedResponse<Verdict>> => {
    const { getVerdictClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getVerdictClient().findLatestPaginated(params.query);
  },
});

const verdictsHistoryRoute = createServerRoute({
  endpoint: 'GET /internal/sig_events/verdicts/{discoveryId}/history',
  options: {
    access: 'internal',
    summary: 'Get verdict history',
    description:
      'Get all historical verdicts for a discovery. Param is discovery_id (verdicts are grouped by discovery).',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      discoveryId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<{ hits: Verdict[] }> => {
    const { getVerdictClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getVerdictClient().findByDiscoverySlug(params.path.discoveryId);
  },
});

const verdictsBulkCreateRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/verdicts',
  options: {
    access: 'internal',
    summary: 'Bulk create verdicts',
    description: 'Create verdict entities in bulk.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.array(verdictSchema),
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { getVerdictClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getVerdictClient().bulkCreate(params.body);
  },
});

export const internalSigEventsVerdictsRoutes = {
  ...verdictsSearchRoute,
  ...verdictsHistoryRoute,
  ...verdictsBulkCreateRoute,
};
