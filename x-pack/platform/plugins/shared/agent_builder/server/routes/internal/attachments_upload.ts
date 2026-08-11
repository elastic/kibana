/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import { apiPrivileges } from '../../../common/features';
import { createAttachmentsStorage } from '../../services/execution/filesystem/attachments_storage';
import { WorkspaceClient, createWorkspaceStorage } from '../../services/workspaces';
import {
  DEFAULT_ATTACHMENT_UPLOAD_CONTENT_VALIDATORS,
  getAttachmentUploadExtension,
} from './attachment_upload_validation';
import type { AttachmentUploadContentValidators } from './attachment_upload_validation';

/** Maximum accepted upload size (50 MiB). Matches the example's previous cap. */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export interface UploadAttachmentResponse {
  attachment_id: string;
}

export function registerAttachmentUploadRoute(
  { router, getInternalServices, coreSetup, logger }: RouteDependencies,
  {
    contentValidators = DEFAULT_ATTACHMENT_UPLOAD_CONTENT_VALIDATORS,
  }: {
    contentValidators?: AttachmentUploadContentValidators;
  } = {}
) {
  const wrapHandler = getHandlerWrapper({ logger });
  const acceptedRequestMimeTypes = [
    'application/octet-stream',
    ...new Set(Object.values(contentValidators).map(({ mimeType }) => mimeType)),
  ];

  router.post(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/attachments/upload`,
      validate: {
        params: schema.object({
          conversation_id: schema.string({ minLength: 1, maxLength: 1024 }),
        }),
        query: schema.object({
          name: schema.string({ minLength: 1, maxLength: 256 }),
          mime: schema.maybe(schema.string({ maxLength: 128 })),
        }),
        body: schema.buffer(),
      },
      options: {
        access: 'internal',
        body: {
          accepts: acceptedRequestMimeTypes,
          maxBytes: MAX_UPLOAD_BYTES,
          parse: false,
        },
      },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { conversations: conversationsService, attachments: attachmentsService } =
        getInternalServices();
      const { conversation_id: conversationId } = request.params;
      const { name, mime: queryMime } = request.query;

      const extension = getAttachmentUploadExtension(name);
      const contentValidator = extension ? contentValidators[extension] : undefined;
      if (!contentValidator) {
        return response.badRequest({
          body: {
            message: `Unsupported file type: ${name}. Accepted extensions: ${Object.keys(
              contentValidators
            ).join(', ')}.`,
          },
        });
      }
      const mime = contentValidator.mimeType.toLowerCase();
      if (queryMime && queryMime.toLowerCase() !== mime) {
        return response.badRequest({
          body: {
            message: `File extension .${extension} requires MIME type ${mime}, received ${queryMime}`,
          },
        });
      }

      // Body parsing is disabled so the exact uploaded bytes are preserved.
      // `schema.buffer()` guarantees that the handler receives a Buffer instead
      // of the default Readable stream used by routes without body validation.
      const bytes = request.body;
      if (bytes.length === 0) {
        return response.badRequest({ body: { message: 'Uploaded file is empty' } });
      }
      if (bytes.length > MAX_UPLOAD_BYTES) {
        return response.badRequest({
          body: { message: `Uploaded file exceeds the ${MAX_UPLOAD_BYTES} byte limit` },
        });
      }
      const validationError = contentValidator.validate(bytes);
      if (validationError) {
        return response.badRequest({ body: { message: validationError } });
      }

      const conversationClient = await conversationsService.getScopedClient({ request });
      const conversation = await conversationClient.get(conversationId);

      const [coreStart] = await coreSetup.getStartServices();
      const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
      const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;

      const attachmentsStorage = createAttachmentsStorage({
        workspaceClient: new WorkspaceClient({
          storage: createWorkspaceStorage({ logger, esClient }),
          space: spaceId,
        }),
      });

      // Ensure the conversation has a workspace id; mint one if missing so the
      // uploaded bytes are addressable when the agent next runs.
      let workspaceId = conversation.workspace_id;
      if (!workspaceId) {
        workspaceId = uuidv4();
        await conversationClient.update({ id: conversationId, workspace_id: workspaceId });
      }

      const attachmentId = uuidv4();
      await attachmentsStorage.store(workspaceId, attachmentId, bytes, {
        name,
        mime,
        size: bytes.length,
      });

      const stateManager = createAttachmentStateManager(conversation.attachments ?? [], {
        getTypeDefinition: attachmentsService.getTypeDefinition,
      });

      const resolveContext: AttachmentResolveContext = {
        request,
        spaceId,
        savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
      };

      let attachment;
      try {
        // By-reference: origin carries `workspaceId/attachmentId` so the
        // platform `uploaded_file` resolve hook can read the sidecar meta
        // from workspace storage and validate mime/ext.
        attachment = await stateManager.add(
          {
            id: attachmentId,
            type: AttachmentType.uploadedFile,
            origin: `${workspaceId}/${attachmentId}`,
            description: name,
          },
          ATTACHMENT_REF_ACTOR.user,
          resolveContext
        );
      } catch (e) {
        // Roll back the stored bytes so we don't leak orphaned content.
        await attachmentsStorage.delete(workspaceId, attachmentId);
        return response.badRequest({ body: { message: e.message } });
      }

      await conversationClient.update({
        id: conversationId,
        attachments: stateManager.getAll(),
      });

      logger.debug(
        `upload: stored ${attachment.id} (${bytes.length} bytes, ${mime}) for conversation ${conversationId}`
      );

      return response.ok<UploadAttachmentResponse>({
        body: { attachment_id: attachment.id },
      });
    })
  );
}
