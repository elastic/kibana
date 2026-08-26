/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import {
  CONVERSATION_ID_MAX_LENGTH,
  CONVERSATION_TITLE_MAX_LENGTH,
} from '@kbn/agent-builder-common';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  MarkPinnedConversationResponse,
  MarkReadConversationResponse,
  RenameConversationResponse,
} from '../../../common/http_api/conversations';
import type { ApplyTemplateResponse } from '../../../common/http_api/apply_template';
import type { PatchConversationMetadataResponse } from '../../../common/http_api/patch_metadata';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';

export function registerInternalConversationRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // rename conversation
  router.post(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/_rename`,
      validate: {
        params: schema.object({
          conversation_id: schema.string({ maxLength: CONVERSATION_ID_MAX_LENGTH }),
        }),
        body: schema.object({
          title: schema.string({ maxLength: CONVERSATION_TITLE_MAX_LENGTH }),
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
      const updatedConversation = await client.update(
        { id: conversationId, title },
        { access: 'rename', retryOnConflict: true }
      );

      return response.ok<RenameConversationResponse>({
        body: {
          id: updatedConversation.id,
          title: updatedConversation.title,
        },
      });
    })
  );

  router.post(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/_apply_template`,
      validate: {
        params: schema.object({
          conversation_id: schema.string({ maxLength: CONVERSATION_ID_MAX_LENGTH }),
        }),
        body: schema.object({
          template_id: schema.string({ maxLength: 256 }),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(
      async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;
        const { template_id: templateId } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const updatedConversation = await client.applyTemplate(conversationId, templateId);

        return response.ok<ApplyTemplateResponse>({
          body: { id: updatedConversation.id },
        });
      },
      { featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID }
    )
  );

  router.patch(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/metadata`,
      validate: {
        params: schema.object({
          conversation_id: schema.string({ maxLength: CONVERSATION_ID_MAX_LENGTH }),
        }),
        body: schema.object({
          metadata: schema.recordOf(
            schema.string({ maxLength: 256 }),
            schema.oneOf([
              schema.string({ maxLength: 10_000 }),
              schema.number(),
              schema.boolean(),
              schema.arrayOf(schema.string({ maxLength: 2_000 }), { maxSize: 100 }),
            ]),
            {
              validate: (record) => {
                if (Object.keys(record).length > 100) {
                  return 'metadata may not have more than 100 keys';
                }
              },
            }
          ),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(
      async (ctx, request, response) => {
        const { conversations: conversationsService } = getInternalServices();
        const { conversation_id: conversationId } = request.params;
        const { metadata } = request.body;

        const client = await conversationsService.getScopedClient({ request });
        const updatedConversation = await client.patchMetadata(conversationId, metadata);

        return response.ok<PatchConversationMetadataResponse>({
          body: {
            id: updatedConversation.id,
            metadata: updatedConversation.metadata ?? {},
          },
        });
      },
      { featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID }
    )
  );

  router.post(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/_mark_read`,
      validate: {
        params: schema.object({
          conversation_id: schema.string({ maxLength: CONVERSATION_ID_MAX_LENGTH }),
        }),
        body: schema.object({
          read: schema.boolean(),
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
      const { read } = request.body;

      const client = await conversationsService.getScopedClient({ request });
      const updatedConversation = await client.update(
        {
          id: conversationId,
          read,
        },
        { access: 'converse', retryOnConflict: true }
      );

      return response.ok<MarkReadConversationResponse>({
        body: {
          id: updatedConversation.id,
          read: updatedConversation.read!,
        },
      });
    })
  );

  router.post(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/_set_pinned`,
      validate: {
        params: schema.object({
          conversation_id: schema.string({ maxLength: CONVERSATION_ID_MAX_LENGTH }),
        }),
        body: schema.object({
          pinned: schema.boolean(),
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
      const { pinned } = request.body;

      const client = await conversationsService.getScopedClient({ request });
      const updatedConversation = await client.update(
        { id: conversationId, pinned },
        { access: 'converse', retryOnConflict: true }
      );

      return response.ok<MarkPinnedConversationResponse>({
        body: {
          id: updatedConversation.id,
          pinned: updatedConversation.pinned ?? false,
        },
      });
    })
  );
}
