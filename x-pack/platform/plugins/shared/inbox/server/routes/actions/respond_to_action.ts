/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  INBOX_ACTION_RESPOND_URL_TEMPLATE,
  RespondToInboxActionRequestBody,
  RespondToInboxActionRequestParams,
  type RespondToInboxActionResponse,
} from '@kbn/inbox-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { INBOX_API_PRIVILEGE_RESPOND } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import {
  isInboxActionConflictError,
  isUnknownInboxSourceAppError,
} from '../../services/inbox_action_registry';

export const registerRespondToActionRoute = ({
  router,
  logger,
  registry,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: INBOX_ACTION_RESPOND_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [INBOX_API_PRIVILEGE_RESPOND] },
      },
      summary: 'Respond to an inbox action',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(RespondToInboxActionRequestParams),
            body: buildRouteValidationWithZod(RespondToInboxActionRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        const { source_app: sourceApp, source_id: sourceId } = request.params;

        try {
          await registry.respondTo(sourceApp, sourceId, request.body.input, {
            request,
            spaceId: getSpaceId(request),
          });

          const body: RespondToInboxActionResponse = { ok: true };
          return response.ok({ body });
        } catch (error) {
          if (isUnknownInboxSourceAppError(error)) {
            return response.notFound({
              body: { message: error.message },
            });
          }
          if (isInboxActionConflictError(error)) {
            // The action exists in our addressing scheme but the underlying
            // resource (e.g. a workflow step) is no longer in a state that
            // can accept a response. Surface as 409 so clients can refresh
            // their inbox instead of treating it like a server error.
            return response.conflict({
              body: { message: error.message },
            });
          }
          logger.error(`Failed to respond to inbox action ${sourceApp}/${sourceId}: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to respond to inbox action' },
          });
        }
      }
    );
};
