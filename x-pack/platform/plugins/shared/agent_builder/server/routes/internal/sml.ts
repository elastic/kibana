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
import { SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import {
  SML_HTTP_ATTACH_ITEMS_MAX,
  type SmlAttachHttpResponse,
  type SmlAttachHttpResultItem,
} from '../../../common/http_api/sml';
import { AGENT_BUILDER_WRITE_SECURITY } from '../route_security';
import { applyAttachmentRefsToRounds } from '../../services/conversation/client/migrate_attachments';

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
        const [coreStart, startDeps] = await coreSetup.getStartServices();
        if (!startDeps.semanticLayer) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Semantic layer plugin is not available' },
          });
        }
        const sml = startDeps.semanticLayer.getSmlService();
        const { conversations: conversationsService, attachments: attachmentsService } =
          getInternalServices();
        const { conversation_id: conversationId, chunk_ids: chunkIds } = request.body;
        const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
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

        const uniqueChunkIds = [...new Set(chunkIds)];

        const accessMap = await sml.checkItemsAccess({
          ids: uniqueChunkIds,
          spaceId,
          esClient,
          request,
        });

        const authorizedIds = uniqueChunkIds.filter((id) => accessMap.get(id) === true);
        const smlDocs = await sml.getDocuments({
          ids: authorizedIds,
          spaceId,
          esClient,
        });

        const stateManager = createAttachmentStateManager(
          conversationForAttach.attachments ?? [],
          {
            getTypeDefinition: attachmentsService.getTypeDefinition,
          }
        );

        const resultItems = await Promise.all(
          uniqueChunkIds.map(async (chunkId): Promise<SmlAttachHttpResultItem> => {
            if (!accessMap.get(chunkId)) {
              return {
                success: false,
                chunk_id: chunkId,
                message: `Access denied: you do not have the required permissions to access SML item '${chunkId}'`,
              };
            }

            const smlDoc = smlDocs.get(chunkId);
            if (!smlDoc) {
              return {
                success: false,
                chunk_id: chunkId,
                message: `SML document '${chunkId}' not found in the index`,
              };
            }

            const smlTypeDef = sml.getTypeDefinition(smlDoc.type);
            if (!smlTypeDef?.originType) {
              return {
                success: false,
                chunk_id: chunkId,
                attachment_type: smlDoc.type,
                message: `SML type '${smlDoc.type}' does not support attachment`,
              };
            }

            const attachmentTypeDef = attachmentsService.getTypeDefinitionByOriginType(
              smlTypeDef.originType
            );

            if (!attachmentTypeDef?.resolve) {
              return {
                success: false,
                chunk_id: chunkId,
                attachment_type: smlDoc.type,
                message: `No attachment type found for origin type '${smlTypeDef.originType}'`,
              };
            }

            try {
              const added = await stateManager.add(
                {
                  type: attachmentTypeDef.id,
                  origin: smlDoc.origin_id,
                  description: `${smlDoc.type}/${smlDoc.title}`,
                },
                ATTACHMENT_REF_ACTOR.system,
                {
                  request,
                  spaceId,
                  savedObjectsClient,
                }
              );

              return {
                success: true,
                chunk_id: chunkId,
                conversation_attachment_id: added.id,
                attachment_type: attachmentTypeDef.id,
                message: `Attachment '${added.id}' of type '${attachmentTypeDef.id}' created from SML item '${chunkId}'`,
              };
            } catch (e) {
              return {
                success: false,
                chunk_id: chunkId,
                attachment_type: attachmentTypeDef.id,
                message: e instanceof Error ? e.message : String(e),
              };
            }
          })
        );

        if (resultItems.some((r) => r.success)) {
          const latestConversation = await conversationClient.get(conversationId);
          const newRefs = stateManager.getAccessedRefs();

          const lastRoundIndex = latestConversation.rounds.length - 1;
          const updatedRounds = applyAttachmentRefsToRounds(
            latestConversation.rounds,
            new Map([[lastRoundIndex, newRefs]])
          );
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
        featureFlag: SEMANTIC_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID,
      }
    )
  );
}
