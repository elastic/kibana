/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { WORKFLOW_UPDATE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerDisableAllWorkflowsRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .post({
      path: '/internal/workflows/disable',
      access: 'internal',
      security: WORKFLOW_UPDATE_SECURITY,
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: false,
      },
      withAvailabilityCheck(async (_context, request, response) => {
        const spaceId = spaces.getSpaceId(request);
        const result = await api.disableAllWorkflows(spaceId, request);
        return response.ok({
          body: result,
        });
      })
    );
}
