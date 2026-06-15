/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { discoverySchema, type Discovery } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type { PaginatedResponse } from '../../../../lib/sig_events/query_utils';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const discoveriesSearchRoute = createServerRoute({
  endpoint: 'GET /internal/sig_events/discoveries',
  options: {
    access: 'internal',
    summary: 'Get latest discoveries',
    description: 'Search discovery entities using their latest derived state with pagination.',
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
  }): Promise<PaginatedResponse<Discovery>> => {
    const { getDiscoveryClient, getEventClient, licensing, uiSettingsClient } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const result = await getDiscoveryClient().findLatestPaginated(params.query);
    const slugs = result.hits.map((h) => h.discovery_slug).filter(Boolean);
    const eventsBySlug = await getEventClient().findLatestBySlugs(slugs);

    return {
      ...result,
      hits: result.hits.map((h) => {
        const latestEvent = eventsBySlug.get(h.discovery_slug);
        // Cleared discoveries (kind === 'clearance'): the resolved event carries
        // discovery_id "original-clearance" (from the clearance doc), not "original",
        // so the id check would always fail. For cleared slugs there is no recurrence
        // risk — a new occurrence unmarks the slug as cleared — so show the latest
        // event status directly.
        // Active discoveries: require discovery_id match so a stale resolved event
        // from a previous occurrence does not bleed onto a new pending occurrence.
        return {
          ...h,
          event_status:
            h.kind === 'clearance'
              ? latestEvent?.status
              : latestEvent?.discovery_id === h.discovery_id
              ? latestEvent.status
              : undefined,
        };
      }),
    };
  },
});

const discoveriesHistoryRoute = createServerRoute({
  endpoint: 'GET /internal/sig_events/discoveries/{id}/history',
  options: {
    access: 'internal',
    summary: 'Get discovery history',
    description: 'Get all historical versions of a discovery entity.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ hits: Discovery[] }> => {
    const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const result = await getDiscoveryClient().findBySlug(params.path.id);
    return { hits: result.hits.filter((d) => d.kind !== 'handled') };
  },
});

const discoveriesBulkCreateRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/discoveries',
  options: {
    access: 'internal',
    summary: 'Bulk create discoveries',
    description: 'Create discovery entities in bulk.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.array(discoverySchema),
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getDiscoveryClient().bulkCreate(params.body);
  },
});

export const internalSigEventsDiscoveriesRoutes = {
  ...discoveriesSearchRoute,
  ...discoveriesHistoryRoute,
  ...discoveriesBulkCreateRoute,
};
