/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_BLIND_SPOTS,
  MAX_HYPOTHESES,
  MAX_RECOMMENDATIONS,
  MAX_SIGNIFICANT_EVENT_UPDATES,
  MAX_TEXT_LENGTH,
} from '@kbn/significant-events-schema';
import { UPDATABLE_INVESTIGATION_STATUSES } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const updateInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PATCH /internal/nightshift/investigations/{id}',
  options: {
    access: 'internal',
    summary: 'Update investigation state',
    description:
      'Updates the investigation saved object with structured output and/or terminal status. Called by workflow steps at completion.',
  },
  security: {
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(500),
    }),
    body: z.object({
      status: z.enum(UPDATABLE_INVESTIGATION_STATUSES),
      error: z.string().max(MAX_TEXT_LENGTH).optional(),
      summary: z.string().max(MAX_TEXT_LENGTH).optional(),
      conclusion: z.string().max(MAX_TEXT_LENGTH).optional(),
      hypotheses: z.array(z.record(z.string(), z.unknown())).max(MAX_HYPOTHESES).optional(),
      recommendations: z
        .array(z.record(z.string(), z.unknown()))
        .max(MAX_RECOMMENDATIONS)
        .optional(),
      blind_spots: z.array(z.record(z.string(), z.unknown())).max(MAX_BLIND_SPOTS).optional(),
      significant_event_updates: z
        .array(z.record(z.string(), z.unknown()))
        .max(MAX_SIGNIFICANT_EVENT_UPDATES)
        .optional(),
    }),
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const client = getInvestigationsClient(request);
    await client.update(params.path.id, params.body);
    return { acknowledged: true };
  },
});
