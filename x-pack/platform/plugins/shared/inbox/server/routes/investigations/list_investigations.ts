/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS } from '@kbn/inbox-common';
import { INBOX_API_PRIVILEGE_READ } from '../../../common';
import {
  INBOX_INVESTIGATIONS_URL,
  type ListInvestigationsResponse,
} from '../../../common/investigations';
import type { RouteDependencies } from '../register_routes';

export const registerListInvestigationsRoute = ({
  router,
  logger,
  getInvestigationProjection,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: INBOX_INVESTIGATIONS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [INBOX_API_PRIVILEGE_READ] },
      },
      summary: 'List investigations (Conversation projection)',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
        },
      },
      async (_context, request, response) => {
        try {
          const projection = getInvestigationProjection?.();
          if (!projection) {
            return response.customError({
              statusCode: 503,
              body: { message: 'Investigation projection service is not available' },
            });
          }
          const body: ListInvestigationsResponse = await projection.list(request);
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list investigations: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list investigations' },
          });
        }
      }
    );
};
