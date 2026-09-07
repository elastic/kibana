/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

export const getInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/investigations/{id}',
  options: {
    access: 'internal',
    summary: 'Get an investigation',
    description: 'Retrieves the current state of an investigation by ID.',
  },
  security: {
    // agentBuilder:read is used as a proxy for "this user has AI feature access." Investigation
    // results are fetched by workflow execution ID (not through the AB conversation list), so
    // this is not a strict AB permission requirement. It is consistent with the write requirement
    // on the start route: read ensures baseline AI feature visibility for polling. See
    // start_investigation.ts for fuller reasoning.
    authz: {
      requiredPrivileges: ['agentBuilder:read'],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const investigationClient = getInvestigationsClient(request);
    try {
      return await investigationClient.get(params.path.id);
    } catch (err) {
      rethrowInvestigationClientError(err);
    }
  },
});
