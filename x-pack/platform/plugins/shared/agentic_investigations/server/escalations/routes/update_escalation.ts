/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { ESCALATION_BY_ID_URL } from '../../../common/escalations/constants';
import { updateEscalationRequestSchema } from '../../../common/escalations/escalation';
import { ESCALATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import type { EscalationRouteDependencies } from '../types';
import { handleEscalationRouteError } from './handle_route_error';
import { escalationIdParamsSchema } from './shared';

export const registerUpdateEscalationRoute = ({
  router,
  logger,
  getEscalationsService,
}: EscalationRouteDependencies) => {
  router.versioned
    .patch({
      path: ESCALATION_BY_ID_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [ESCALATIONS_API_PRIVILEGE_MANAGE] } },
      summary: 'Update an escalation title, linked investigations, or status',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(escalationIdParamsSchema),
            body: buildRouteValidationWithZod(updateEscalationRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const service = getEscalationsService();
          const escalation = await service.update(request, request.params.id, request.body);

          let attachmentsCopy: { copied: number; failed: number } | undefined;
          const newInvestigationIds = request.body.linked_investigations;
          if (newInvestigationIds?.length) {
            try {
              attachmentsCopy = await service.addAttachments(
                request,
                request.params.id,
                newInvestigationIds
              );
            } catch (attachErr) {
              logger.warn(
                `[escalations] Attachment copy failed after investigation link; escalation was still updated. escalationId=${
                  request.params.id
                } error=${(attachErr as Error).message}`
              );
            }
          }

          return response.ok({
            body: {
              ...escalation,
              ...(attachmentsCopy !== undefined && { attachments_copy: attachmentsCopy }),
            },
          });
        } catch (error) {
          return handleEscalationRouteError(error, response, logger);
        }
      }
    );
};
