/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const getInvestigationAvailabilityRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/investigations/availability',
  options: {
    access: 'internal',
    summary: 'Get investigation availability',
  },
  security: { authz: { requiredPrivileges: ['agentBuilder:write'] } },
  params: z.object({}),
  handler: async ({ request, getInvestigationsClient }) => ({
    available: await getInvestigationsClient(request).isAvailable(),
  }),
});
