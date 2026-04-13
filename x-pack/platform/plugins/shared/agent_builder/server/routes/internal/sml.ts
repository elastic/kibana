/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import {
  SML_HTTP_ATTACH_ITEMS_MAX,
  SML_HTTP_SEARCH_QUERY_MAX_LENGTH,
  type SmlAttachHttpResponse,
  type SmlAttachHttpResultItem,
  type SmlSearchHttpResponse,
} from '../../../common/http_api/sml';
import { AGENT_BUILDER_READ_SECURITY, AGENT_BUILDER_WRITE_SECURITY } from '../route_security';
import { resolveSmlAttachItems } from '../../services/sml/execute_sml_attach_items';
import { applyAttachmentRefsToRounds } from '../../services/conversation/client/migrate_attachments';

/** Max page size for SML HTTP search (separate from default UI size). */
const SML_SEARCH_SIZE_MAX = 1000;

const mergeAttachmentsById = (
  latestAttachments: VersionedAttachment[],
  stateManagerAttachments: VersionedAttachment[]
) => {
  const mergedAttachments = new Map<string, VersionedAttachment>();

  for (const attachment of stateManagerAttachments) {
    mergedAttachments.set(attachment.id, attachment);
  }

  for (const attachment of latestAttachments) {
    mergedAttachments.set(attachment.id, attachment);
  }

  return Array.from(mergedAttachments.values());
};

export function registerInternalSmlRoutes({
  router,
  getInternalServices,
  logger,
  coreSetup,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: `${internalApiPath}/sml/_search`,
      validate: {
        body: schema.object({
          query: schema.string({ minLength: 1, maxLength: SML_HTTP_SEARCH_QUERY_MAX_LENGTH }),
          size: schema.maybe(schema.number({ min: 1, max: SML_SEARCH_SIZE_MAX })),
          skip_content: schema.maybe(schema.boolean()),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(
      async (ctx, request, response) => {
        const { sml } = getInternalServices();
        const { query, size, skip_content: skipContent } = request.body;
        const esClient = (await ctx.core).elasticsearch.client;
        const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();

        const { results, total } = await sml.search({
          query,
          size,
          spaceId,
          esClient,
          request,
          skipContent,
        });

        const body: SmlSearchHttpResponse = {
          total,
          results: results.map(({ id, type, origin_id, title, score, content }) => ({
            id,
            type,
            origin_id,
            title,
            score,
            ...(skipContent ? {} : { content }),
          })),
        };

        return response.ok({ body });
      },
      {
        featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
      }
    )
  );

  router.post(
    {
      path: `${internalApiPath}/sml/_attach`,
      validate: {
        body: schema.object({
          conversation_id: schema.string(),
          chunk_ids: schema.arrayOf(schema.string(), {
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
        const {
          sml,
          conversations: conversationsService,
          attachments: attachmentsService,
        } = getInternalServices();
        const { conversation_id: conversationId, chunk_ids: chunkIds } = request.body;
        const [coreStart] = await coreSetup.getStartServices();
        const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
        const esClient = (await ctx.core).elasticsearch.client;
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
        const conversationClient = await conversationsService.getScopedClient({ request });

        const conversationForAttach = await conversationClient.get(conversationId);
        if (conversationForAttach.rounds.length === 0) {
          return response.badRequest({
            body: {
              message: `Conversation '${conversationId}' has no rounds — cannot attach SML items without an existing round`,
            },
          });
        }

        const resolvedItems = await resolveSmlAttachItems({
          chunkIds,
          sml,
          esClient,
          request,
          spaceId,
          savedObjectsClient,
          logger,
        });

        const stateManager = createAttachmentStateManager(conversationForAttach.attachments ?? [], {
          getTypeDefinition: attachmentsService.getTypeDefinition,
        });

        // Format the results for the HTTP API
        const resultItems = await Promise.all(
          resolvedItems.map(async (r): Promise<SmlAttachHttpResultItem> => {
            if (!r.success) {
              return {
                success: false,
                chunk_id: r.chunk_id,
                attachment_type: r.attachment_type,
                message: r.message,
              };
            }

            try {
              const added = await stateManager.add(r.attachment, ATTACHMENT_REF_ACTOR.system, {
                request,
                spaceId,
                savedObjectsClient,
              });

              return {
                success: true,
                chunk_id: r.chunk_id,
                conversation_attachment_id: added.id,
                attachment_type: r.attachment.type,
                message: `Attachment '${added.id}' of type '${r.attachment.type}' created from SML item '${r.chunk_id}'`,
              };
            } catch (e) {
              return {
                success: false,
                chunk_id: r.chunk_id,
                attachment_type: r.attachment.type,
                message: e instanceof Error ? e.message : String(e),
              };
            }
          })
        );

        // Update the conversation with the new attachments
        if (resultItems.some((r) => r.success)) {
          const latestConversation = await conversationClient.get(conversationId);
          const newRefs = stateManager.getAccessedRefs();

          const lastRoundIndex = latestConversation.rounds.length - 1;
          const updatedRounds = applyAttachmentRefsToRounds(
            latestConversation.rounds,
            new Map([[lastRoundIndex, newRefs]])
          );
          // Merge attachments to prevent duplication or overwriting older attachments
          const mergedAttachments = mergeAttachmentsById(
            latestConversation.attachments ?? [],
            stateManager.getAll()
          );

          await conversationClient.update({
            id: conversationId,
            attachments: mergedAttachments,
            rounds: updatedRounds,
          });
        }

        const body: SmlAttachHttpResponse = { results: resultItems };

        return response.ok({ body });
      },
      {
        featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
      }
    )
  );
}
