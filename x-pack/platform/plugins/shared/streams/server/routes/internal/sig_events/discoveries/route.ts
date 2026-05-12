/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { discoverySchema, type Discovery } from '@kbn/streams-schema';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const stringArrayFromQuery = z
  .union([z.string().transform((value) => [value]), z.array(z.string())])
  .optional();

const discoverySortEnum = z.enum([
  '@timestamp:asc',
  '@timestamp:desc',
  'criticality:asc',
  'criticality:desc',
]);
const discoverySortFromQuery = z
  .union([discoverySortEnum.transform((value) => [value]), z.array(discoverySortEnum)])
  .optional();

const discoveriesSearchQuery = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  kind: z.enum(['finding', 'clearance']).optional(),
  discovery_id: stringArrayFromQuery,
  exclude_discovery_id: stringArrayFromQuery,
  exclude_grouped: BooleanFromString.optional(),
  size: z.coerce.number().int().positive().optional(),
  sort: discoverySortFromQuery,
});

const discoveriesSearchRoute = createServerRoute({
  endpoint: 'GET /internal/sig_events/discoveries',
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
    query: discoveriesSearchQuery,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ hits: Discovery[] }> => {
    const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getDiscoveryClient().findLatest(params.query);
  },
});

const discoveriesLatestPerSlugRoute = createServerRoute({
  endpoint: 'GET /internal/sig_events/discoveries/_latest_per_slug',
  options: {
    access: 'internal',
    summary: 'Get latest discovery per slug',
    description:
      'Search discovery entities returning the latest derived state per discovery_slug (instead of per discovery_id).',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: discoveriesSearchQuery,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ hits: Discovery[] }> => {
    const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getDiscoveryClient().findLatestPerSlug(params.query);
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
  ...discoveriesLatestPerSlugRoute,
  ...discoveriesBulkCreateRoute,
};
