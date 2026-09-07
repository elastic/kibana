/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { INVESTIGATION_STATUSES } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const listInvestigationsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/investigations',
  options: {
    access: 'internal',
    summary: 'List investigations',
    description: 'Returns a paginated list of investigations in the current space.',
  },
  security: {
    // agentBuilder:read as a proxy for AI feature access. See start_investigation.ts.
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({
    query: z.object({
      statuses: z
        .union([z.enum(INVESTIGATION_STATUSES), z.array(z.enum(INVESTIGATION_STATUSES)).max(5)])
        .transform((v) => (Array.isArray(v) ? v : [v]))
        .optional(),
      created_after: z.string().max(100).datetime({ offset: true }).optional(),
      created_before: z.string().max(100).datetime({ offset: true }).optional(),
      started_after: z.string().max(100).datetime({ offset: true }).optional(),
      started_before: z.string().max(100).datetime({ offset: true }).optional(),
      completed_after: z.string().max(100).datetime({ offset: true }).optional(),
      completed_before: z.string().max(100).datetime({ offset: true }).optional(),
      sort_field: z.enum(['created_at', 'completed_at']).optional(),
      sort_order: z.enum(['asc', 'desc']).optional(),
      page: z.coerce.number().int().min(1).max(100).optional(),
      size: z.coerce.number().int().min(1).max(100).optional(),
    }),
  }),
  handler: async ({ request, params, getInvestigationsClient }) =>
    getInvestigationsClient(request).list(params.query),
});
