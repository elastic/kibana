/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const getImpactedEntitiesRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/investigations/_impacted_entities',
  options: {
    access: 'internal',
    summary: 'List impacted entities',
    description: 'Returns distinct impacted entity name and type pairs in the current space.',
  },
  security: {
    // agentBuilder:read as a proxy for AI feature access. See start_investigation.ts.
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({
    query: z.object({
      created_after: z.string().max(100).datetime({ offset: true }).optional(),
      created_before: z.string().max(100).datetime({ offset: true }).optional(),
      started_after: z.string().max(100).datetime({ offset: true }).optional(),
      started_before: z.string().max(100).datetime({ offset: true }).optional(),
      completed_after: z.string().max(100).datetime({ offset: true }).optional(),
      completed_before: z.string().max(100).datetime({ offset: true }).optional(),
    }),
  }),
  handler: async ({ request, params, getInvestigationsClient }) =>
    getInvestigationsClient(request).getImpactedEntities(params.query),
});
