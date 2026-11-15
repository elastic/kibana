/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import {
  SML_HTTP_ATTACH_ITEMS_MAX,
  type SmlAttachHttpResponse,
  type SmlAttachHttpResultItem,
} from '../../../common/http_api/sml';
import { createAttachmentPublicClient } from '../../services/attachments';
import { AGENT_BUILDER_WRITE_SECURITY } from '../route_security';

export function registerInternalSmlRoutes({
  router,
  getInternalServices,
  logger,
  coreSetup,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: `${internalApiPath}/sml/_attach`,
      validate: {
        body: schema.object({
          conversation_id: schema.string(),
          entry_ids: schema.arrayOf(schema.string(), {
            minSize: 1,
            maxSize: SML_HTTP_ATTACH_ITEMS_MAX,
          }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(
      async (ctx, request, response) => {
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId, entry_ids: entryIds } = request.body;
        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const agentBuilderSml = startDeps.agentBuilderSml;
        const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
        const esClient = (await ctx.core).elasticsearch.client;
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

        // Fail with 404 before resolving any SML item when the conversation does not exist.
        const conversationClient = await conversationsService.getScopedClient({ request });
        await conversationClient.get(conversationId);

        const resolvedItems = await agentBuilderSml.resolveSmlAttachItems({
          entryIds,
          esClient,
          request,
          spaceId,
          savedObjectsClient,
          logger,
        });

        // Each item is persisted through the attachment client so it lands in
        // `conversation.attachments` with its `attachment_added` event, like any other
        // attachment created over HTTP. Items are written sequentially: they target the same
        // conversation document and a per-item write keeps one failure from discarding the rest.
        const attachmentClient = createAttachmentPublicClient({
          request,
          conversationsService,
          attachmentsService,
          coreStart,
          spaces: startDeps.spaces,
          source: 'http_api',
        });

        const resultItems: SmlAttachHttpResultItem[] = [];
        for (const r of resolvedItems) {
          if (!r.success) {
            resultItems.push({
              success: false,
              entry_id: r.entry_id,
              attachment_type: r.attachment_type,
              message: r.message,
            });
            continue;
          }

          try {
            const added = await attachmentClient.create({
              conversationId,
              type: r.attachment.type,
              data: r.attachment.data,
              origin: r.attachment.origin,
              description: r.attachment.description,
            });

            resultItems.push({
              success: true,
              entry_id: r.entry_id,
              conversation_attachment_id: added.id,
              attachment_type: r.attachment.type,
              message: `Attachment '${added.id}' of type '${r.attachment.type}' created from SML item '${r.entry_id}'`,
            });
          } catch (e) {
            resultItems.push({
              success: false,
              entry_id: r.entry_id,
              attachment_type: r.attachment.type,
              message: e instanceof Error ? e.message : String(e),
            });
          }
        }

        const body: SmlAttachHttpResponse = { results: resultItems };

        return response.ok({ body });
      },
      {
        // SML lives inside Agent Builder, so the route requires only the Agent
        // Builder experimental flag.
        featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
      }
    )
  );
}
