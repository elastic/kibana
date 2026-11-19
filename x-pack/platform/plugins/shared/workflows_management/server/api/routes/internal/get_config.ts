/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerGetConfigRoute({ router, workflowsService }: RouteDependencies) {
  router.versioned
    .get({
      path: '/internal/workflows/config',
      access: 'internal',
      security: WORKFLOW_READ_SECURITY,
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: false,
      },
      withAvailabilityCheck(async (_context, _request, response) => {
        const { triggerEvents } = await workflowsService.getWorkflowsExecutionEngine();
        return response.ok({
          body: {
            eventDrivenExecutionEnabled: triggerEvents.isEnabled,
          },
        });
      })
    );
}
