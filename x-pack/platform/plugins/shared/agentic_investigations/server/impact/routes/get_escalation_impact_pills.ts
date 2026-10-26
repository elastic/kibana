/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IMPACT_ESCALATION_SUMMARY_URL } from '../../../common/impact/constants';
import type { ImpactPillsResponse } from '../../../common/impact/impact_pills';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { ESCALATIONS_API_PRIVILEGE_READ } from '../../escalations/constants';
import type { ImpactRouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS } from './shared';

export const registerGetEscalationImpactPillsRoute = ({
  router,
  logger,
  getImpactPillsService,
}: ImpactRouteDependencies) => {
  router.versioned
    .get({
      path: IMPACT_ESCALATION_SUMMARY_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [ESCALATIONS_API_PRIVILEGE_READ] } },
      summary: 'Get the impact entities across all escalations',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: false,
      },
      async (_context, request, response) => {
        try {
          const pills = await getImpactPillsService().forEscalations(request);
          const body: ImpactPillsResponse = { pills };
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
