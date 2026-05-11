/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { apiPrivileges } from '../../common/features';
import { smlIndexAttachmentPath } from '../../common/constants';
import type { SmlIndexAttachmentHttpResponse } from '../../common/http_api/sml';
import {
  SML_HTTP_CHUNK_CONTENT_MAX_LENGTH,
  SML_HTTP_CHUNK_DESCRIPTION_MAX_LENGTH,
  SML_HTTP_CHUNK_TITLE_MAX_LENGTH,
  SML_HTTP_INDEX_ATTACHMENT_TYPE_MAX_LENGTH,
  SML_HTTP_INDEX_MAX_CHUNKS,
  SML_HTTP_INDEX_ORIGIN_ID_MAX_LENGTH,
} from '../../common/http_api/sml';
import type { SmlChunk, SmlService } from '../services/sml/types';
import type { AgentContextLayerPluginStart, AgentContextLayerStartDependencies } from '../types';

const AGENT_CONTEXT_LAYER_WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeAgentContextLayer] },
};

const chunkSchema = schema.object({
  type: schema.string({ minLength: 1, maxLength: SML_HTTP_INDEX_ATTACHMENT_TYPE_MAX_LENGTH }),
  title: schema.string({ minLength: 1, maxLength: SML_HTTP_CHUNK_TITLE_MAX_LENGTH }),
  content: schema.string({ minLength: 1, maxLength: SML_HTTP_CHUNK_CONTENT_MAX_LENGTH }),
  description: schema.maybe(
    schema.string({ minLength: 0, maxLength: SML_HTTP_CHUNK_DESCRIPTION_MAX_LENGTH })
  ),
  user_id: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
  references: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  permissions: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
});

const writeBodySchema = schema.object({
  origin_id: schema.string({ minLength: 1, maxLength: SML_HTTP_INDEX_ORIGIN_ID_MAX_LENGTH }),
  attachment_type: schema.string({
    minLength: 1,
    maxLength: SML_HTTP_INDEX_ATTACHMENT_TYPE_MAX_LENGTH,
  }),
  action: schema.oneOf([schema.literal('create'), schema.literal('update')]),
  chunks: schema.arrayOf(chunkSchema, { minSize: 1, maxSize: SML_HTTP_INDEX_MAX_CHUNKS }),
});

const deleteBodySchema = schema.object({
  origin_id: schema.string({ minLength: 1, maxLength: SML_HTTP_INDEX_ORIGIN_ID_MAX_LENGTH }),
  attachment_type: schema.string({
    minLength: 1,
    maxLength: SML_HTTP_INDEX_ATTACHMENT_TYPE_MAX_LENGTH,
  }),
  action: schema.literal('delete'),
});

const bodySchema = schema.oneOf([writeBodySchema, deleteBodySchema]);

export const registerIndexAttachmentRoute = ({
  router,
  coreSetup,
  logger,
  getSmlService,
}: {
  router: IRouter;
  coreSetup: CoreSetup<AgentContextLayerStartDependencies, AgentContextLayerPluginStart>;
  logger: Logger;
  getSmlService: () => SmlService;
}) => {
  router.post(
    {
      path: smlIndexAttachmentPath,
      validate: { body: bodySchema },
      options: { access: 'internal' },
      security: AGENT_CONTEXT_LAYER_WRITE_SECURITY,
    },
    async (ctx, request, response) => {
      try {
        const coreContext = await ctx.core;
        const uiSettingsClient = coreContext.uiSettings.client;

        const isEnabled = await uiSettingsClient.get<boolean>(
          AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID
        );
        if (!isEnabled) {
          return response.notFound();
        }

        const sml = getSmlService();
        const body = request.body;
        const originId = body.origin_id;
        const attachmentType = body.attachment_type;

        if (!sml.getTypeDefinition(attachmentType)) {
          return response.badRequest({
            body: `Unknown SML attachment type: '${attachmentType}'`,
          });
        }

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const baseParams = {
          originId,
          attachmentType,
          spaces: [spaceId],
          esClient: coreContext.elasticsearch.client.asInternalUser,
          savedObjectsClient: coreContext.savedObjects.client,
          logger,
        };

        if (body.action === 'delete') {
          // HTTP surface is always a `direct` operation: user-driven deletes
          // wipe any chunks for the origin regardless of crawler state.
          await sml.indexAttachment({ ...baseParams, action: 'delete', source: 'direct' });
        } else {
          const chunks: SmlChunk[] = body.chunks.map((chunk) => ({
            type: chunk.type,
            title: chunk.title,
            content: chunk.content,
            ...(chunk.description !== undefined ? { description: chunk.description } : {}),
            ...(chunk.user_id !== undefined ? { user_id: chunk.user_id } : {}),
            ...(chunk.references !== undefined ? { references: chunk.references } : {}),
            ...(chunk.permissions !== undefined ? { permissions: chunk.permissions } : {}),
          }));

          await sml.indexAttachment({
            ...baseParams,
            action: body.action,
            chunks,
            source: 'direct',
          });
        }

        const responseBody: SmlIndexAttachmentHttpResponse = { acknowledged: true };
        return response.ok({ body: responseBody });
      } catch (error) {
        logger.error(`SML index_attachment route error: ${(error as Error).message}`);
        throw error;
      }
    }
  );
};
