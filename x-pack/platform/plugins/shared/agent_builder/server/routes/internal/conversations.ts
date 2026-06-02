/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  PatchConversationResponse,
  RenameConversationResponse,
} from '../../../common/http_api/conversations';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';

const patchConversationBodySchema = schema.object({
  title: schema.maybe(schema.string({ maxLength: 256 })),
  template_id: schema.maybe(schema.string({ maxLength: 256 })),
  custom_fields: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

export function registerInternalConversationRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // rename conversation (title only — prefer PATCH for new callers)
  router.post(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/_rename`,
      validate: {
        params: schema.object({
          conversation_id: schema.string(),
        }),
        body: schema.object({
          title: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const { conversation_id: conversationId } = request.params;
      const { title } = request.body;

      const client = await conversationsService.getScopedClient({ request });
      const updatedConversation = await client.update({
        id: conversationId,
        title,
      });

      return response.ok<RenameConversationResponse>({
        body: {
          id: updatedConversation.id,
          title: updatedConversation.title,
        },
      });
    })
  );

  // partial update: title + conversation metadata (not rounds/timeline/attachments/state)
  router.patch(
    {
      path: `${internalApiPath}/conversations/{conversation_id}`,
      validate: {
        params: schema.object({
          conversation_id: schema.string({ maxLength: 256 }),
        }),
        body: patchConversationBodySchema,
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService } = getInternalServices();
      const { conversation_id: conversationId } = request.params;
      const { title, template_id, custom_fields } = request.body;

      const client = await conversationsService.getScopedClient({ request });
      const updatedConversation = await client.update({
        id: conversationId,
        ...(title !== undefined && { title }),
        ...(template_id !== undefined && { template_id }),
        ...(custom_fields !== undefined && { custom_fields }),
      });

      return response.ok<PatchConversationResponse>({
        body: {
          id: updatedConversation.id,
          ...(title !== undefined && { title: updatedConversation.title }),
          ...(template_id !== undefined && { template_id: updatedConversation.template_id }),
          ...(custom_fields !== undefined && {
            custom_fields: updatedConversation.custom_fields,
          }),
        },
      });
    })
  );
}
