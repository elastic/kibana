/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { IMPACT_INTERNAL_URL } from '../../../common/impact/constants';
import { attachImpactRequestSchema } from '../../../common/impact/impact';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../../investigations/constants';
import type { ImpactRouteDependencies } from '../types';
import { attachImpactToInvestigation } from '../attachments/attach_impact_to_investigation';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS } from './shared';

export const registerAttachImpactRoute = ({
  router,
  logger,
  getImpactService,
  getSpaceId,
  resolveUser,
  getAttachmentClient,
  getConversationClient,
}: ImpactRouteDependencies) => {
  router.versioned
    .post({
      path: IMPACT_INTERNAL_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_API_PRIVILEGE_MANAGE] } },
      summary: 'Attach entities to an investigation impact',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { body: buildRouteValidationWithZod(attachImpactRequestSchema) } },
      },
      async (_context, request, response) => {
        try {
          const spaceId = getSpaceId(request);
          const user = await resolveUser(request);
          const service = getImpactService();
          const [attachments, conversations] = await Promise.all([
            getAttachmentClient(request),
            getConversationClient(request),
          ]);
          const body = await attachImpactToInvestigation({
            attachments,
            conversations,
            conversationId: request.body.conversationId,
            readImpact: () => service.getByConversationId(request.body.conversationId, spaceId),
            writeImpact: () => service.attach(request.body, { spaceId, user }),
            revertImpact: (args) => service.revertAttach(args),
          });
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
