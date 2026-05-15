/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sigEventSchema, type SigEvent } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const eventsSearchRoute = createServerRoute({
  endpoint: 'GET /internal/sig_events/events',
  options: {
    access: 'internal',
    summary: 'Get latest events',
    description: 'Search event entities using their latest derived state.',
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
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<{ hits: SigEvent[] }> => {
    const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getEventClient().findLatest(params.query);
  },
});

const eventsBulkCreateRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/events',
  options: {
    access: 'internal',
    summary: 'Bulk create events',
    description: 'Create event entities in bulk.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.array(sigEventSchema),
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getEventClient().bulkCreate(params.body);
  },
});

export const internalSigEventsEventsRoutes = {
  ...eventsSearchRoute,
  ...eventsBulkCreateRoute,
};
