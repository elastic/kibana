/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { INVESTIGATIONS_PRIVILEGES_URL } from '../../../common/investigations/constants';
import type { InvestigationRouteDependencies } from '../types';
import { handleInvestigationRouteError } from './handle_route_error';

/**
 * Reports the caller's investigation and escalation API privileges. A solution feature (for
 * example AlertZero or Nightshift) can grant them without the agentic investigations UI
 * capabilities, so the template UI asks here before it enables write actions.
 */
export const registerGetInvestigationsPrivilegesRoute = ({
  router,
  logger,
  privileges,
}: InvestigationRouteDependencies) => {
  router.versioned
    .get({
      path: INVESTIGATIONS_PRIVILEGES_URL,
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason: 'Reports the privileges of the caller and reads no investigation data.',
        },
      },
      summary: "Get the caller's investigation privileges",
    })
    .addVersion(
      { version: AGENTIC_INVESTIGATIONS_API_VERSION, validate: false },
      async (_context, request, response) => {
        try {
          return response.ok({ body: await privileges.getPrivileges(request) });
        } catch (error) {
          return handleInvestigationRouteError(error, response, logger);
        }
      }
    );
};
