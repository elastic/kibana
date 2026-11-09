/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { isConversationNotFoundError } from '@kbn/agent-builder-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { assignConversationRequestParamsSchema } from '../../../common/assignments/assignment';
import { INVESTIGATION_IMPACT_MAP_URL } from '../../../common/impact_map/constants';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../../investigations/constants';
import { InvestigationAttachmentInvalidRequestError } from '../../investigation_attachments/errors';
import type { ResolveUser } from '../../services/resolve_user';
import type { ImpactMapService } from '../services/impact_map_service';
import { setImpactMapToolSchema } from '../tools/set_impact_map_tool';

export interface ImpactMapRouteDependencies {
  router: IRouter;
  logger: Logger;
  getImpactMapService: () => ImpactMapService;
  getSpaceId: (request: KibanaRequest) => string;
  resolveUser: ResolveUser;
  getAttachmentClient: (request: KibanaRequest) => Promise<AttachmentPublicClient>;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}

const handleError = (error: unknown, response: KibanaResponseFactory, logger: Logger) => {
  if (isConversationNotFoundError(error)) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof InvestigationAttachmentInvalidRequestError) {
    return response.badRequest({ body: { message: error.message } });
  }
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Investigation impact map route failed: ${message}`);
  return response.customError({ statusCode: 500, body: { message } });
};

/**
 * Replaces an investigation's impact map, as the `set_impact_map` tool does. For automations
 * that draw the map outside an agent turn, and for loading a demo map.
 */
export const registerSetImpactMapRoute = ({
  router,
  logger,
  getImpactMapService,
  getSpaceId,
  resolveUser,
  getAttachmentClient,
  getConversationClient,
}: ImpactMapRouteDependencies) => {
  router.versioned
    .put({
      path: INVESTIGATION_IMPACT_MAP_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_API_PRIVILEGE_MANAGE] } },
      summary: "Replace an investigation's impact map",
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(assignConversationRequestParamsSchema),
            body: buildRouteValidationWithZod(setImpactMapToolSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const [conversations, attachments, user] = await Promise.all([
            getConversationClient(request),
            getAttachmentClient(request),
            resolveUser(request),
          ]);
          const { warnings } = await getImpactMapService().setWithPublicClient({
            conversationId: request.params.id,
            input: request.body,
            spaceId: getSpaceId(request),
            user,
            conversations,
            attachments,
          });
          return response.ok({ body: { acknowledged: true, warnings } });
        } catch (error) {
          return handleError(error, response, logger);
        }
      }
    );
};
