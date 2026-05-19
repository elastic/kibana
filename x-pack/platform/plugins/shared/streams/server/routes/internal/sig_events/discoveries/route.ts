/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { discoverySchema, type Discovery } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const discoverySortEnum = z.enum([
  '@timestamp:asc',
  '@timestamp:desc',
  'criticality:asc',
  'criticality:desc',
]);

const discoveriesSearchBody = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  kind: z.enum(['finding', 'clearance']).optional(),
  discovery_id: z.array(z.string()).optional(),
  exclude_discovery_id: z.array(z.string()).optional(),
  exclude_grouped: z.boolean().optional(),
  size: z.number().int().positive().optional(),
  sort: z.array(discoverySortEnum).optional(),
});

const discoveriesSearchRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/discoveries/_search',
  options: {
    access: 'internal',
    summary: 'Get latest discoveries',
    description: 'Search discovery entities using their latest derived state.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: discoveriesSearchBody,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ hits: Discovery[] }> => {
    const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getDiscoveryClient().findLatest(params.body);
  },
});

const discoveriesCurrentPerSlugRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/discoveries/_current_per_slug',
  options: {
    access: 'internal',
    summary: 'Get current discovery per slug',
    description:
      'Return the current discovery per discovery_slug (collapsed before filtering). A slug whose latest discovery does not match the filters is omitted, even if older matching discoveries exist.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: discoveriesSearchBody,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ hits: Discovery[] }> => {
    const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getDiscoveryClient().findCurrentPerSlug(params.body);
  },
});

const discoveriesBulkCreateRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/discoveries/_bulk',
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
    body: z.object({
      discoveries: z.array(discoverySchema),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getDiscoveryClient().bulkCreate(params.body.discoveries);
  },
});

export const internalSigEventsDiscoveriesRoutes = {
  ...discoveriesSearchRoute,
  ...discoveriesCurrentPerSlugRoute,
  ...discoveriesBulkCreateRoute,
};
