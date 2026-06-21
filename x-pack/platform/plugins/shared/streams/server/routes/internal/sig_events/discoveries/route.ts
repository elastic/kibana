/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { discoverySchema, investigationResultSchema, type Discovery } from '@kbn/streams-schema';
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
    const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getDiscoveryClient().findLatestPaginated(params.query);
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
    return { hits: result.hits };
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

const investigationWriteBackBodySchema = investigationResultSchema.extend({
  workflow_execution_id: z.string().optional(),
});

const discoveryInvestigationWriteBackRoute = createServerRoute({
  endpoint: 'POST /internal/streams/sig_events/discoveries/{discovery_id}/investigation',
  options: {
    access: 'internal',
    summary: 'Write investigation result to discovery',
    description: 'Appends investigation results to an existing discovery document.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      discovery_id: z.string(),
    }),
    body: investigationWriteBackBodySchema,
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { getDiscoveryClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { hits } = await getDiscoveryClient().findById(params.path.discovery_id);
    if (hits.length === 0) {
      throw new Error(`Discovery ${params.path.discovery_id} not found`);
    }

    const latest = hits[hits.length - 1];
    const now = new Date().toISOString();
    const { workflow_execution_id, ...investigationResult } = params.body;

    await getDiscoveryClient().bulkCreate([
      {
        ...latest,
        '@timestamp': now,
        investigation: {
          completed_at: now,
          workflow_execution_id: workflow_execution_id ?? '',
          ...investigationResult,
        },
      },
    ]);

    return { acknowledged: true };
  },
});

export const internalSigEventsDiscoveriesRoutes = {
  ...discoveriesSearchRoute,
  ...discoveriesHistoryRoute,
  ...discoveriesBulkCreateRoute,
  ...discoveryInvestigationWriteBackRoute,
};
