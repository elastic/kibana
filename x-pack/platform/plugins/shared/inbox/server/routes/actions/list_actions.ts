/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INBOX_ACTIONS_URL,
  INTERNAL_API_ACCESS,
  ListInboxActionsRequestQuery,
  type ListInboxActionsResponse,
} from '@kbn/inbox-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { INBOX_API_PRIVILEGE_READ } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerListInboxActionsRoute = ({
  router,
  logger,
  registry,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: INBOX_ACTIONS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [INBOX_API_PRIVILEGE_READ] },
      },
      summary: 'List inbox actions',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(ListInboxActionsRequestQuery),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { status, source_app: sourceApp, page, per_page: perPage } = request.query;
          const spaceId = getSpaceId(request);

          const { actions, total } = await registry.list(
            { status, sourceApp, page, perPage },
            { request, spaceId }
          );

          const body: ListInboxActionsResponse = { actions, total };

          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list inbox actions: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list inbox actions' },
          });
        }
      }
    );
};
