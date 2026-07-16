/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS } from '@kbn/inbox-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { INBOX_API_PRIVILEGE_READ } from '../../../common';
import {
  INBOX_INVESTIGATION_URL_TEMPLATE,
  type InvestigationDetail,
} from '../../../common/investigations';
import type { RouteDependencies } from '../register_routes';

const GetInvestigationRequestParams = z.object({
  conversationId: z.string().min(1).max(256),
});

export const registerGetInvestigationRoute = ({
  router,
  logger,
  getInvestigationProjection,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: INBOX_INVESTIGATION_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [INBOX_API_PRIVILEGE_READ] },
      },
      summary: 'Get investigation detail (Conversation state + attachments)',
      description:
        'POC: reads state + attachments via inbox ES projection. Workaround for queue consumers ' +
        'that need cross-user detail without relying on public GET /conversations/{id} alone. ' +
        'Correct long-term: typed metadata API (#15192) + public conversation read with access_control.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetInvestigationRequestParams),
          },
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
          const { conversationId } = request.params;
          const result = await projection.get(request, conversationId);
          if (!result) {
            return response.notFound({
              body: { message: `Investigation "${conversationId}" not found` },
            });
          }
          const body: InvestigationDetail = result;
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to get investigation: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get investigation' },
          });
        }
      }
    );
};
