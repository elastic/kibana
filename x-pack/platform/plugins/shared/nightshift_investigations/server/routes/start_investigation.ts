/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { INVESTIGATION_SUBJECT_TYPES } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const startInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations',
  options: {
    access: 'internal',
    summary: 'Start an investigation',
    description: 'Triggers an investigation workflow for a given subject.',
  },
  security: {
    // agentBuilder:write is used as a proxy for "this user is authorized to spend AI tokens."
    // The investigation workflow itself creates the Agent Builder conversation — the calling user
    // does not create it directly — so this is not a strict AB permission requirement. We use
    // agentBuilder:write because it is the best available signal that a user has been granted
    // access to AI-resource-consuming features in this deployment. When conversation templates
    // land with their own privilege model, this should be revisited.
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    body: z.object({
      subject: z.object({
        type: z.enum(INVESTIGATION_SUBJECT_TYPES),
        id: z.string().min(1).max(500),
      }),
      concurrency_key: z.string().max(500).optional(),
      context: z
        .record(z.string().max(128), z.unknown())
        .refine((v) => Object.keys(v).length <= 50, { message: 'context exceeds 50 key limit' })
        .optional(),
    }),
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const client = getInvestigationsClient(request);
    // User-initiated starts are always manual.
    const result = await client.start({
      ...params.body,
      trigger_type: 'manual',
    });
    return result;
  },
});
