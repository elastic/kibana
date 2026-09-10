/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import {
  createAttachmentNotFoundError,
  createAttachmentAlreadyExistsError,
  createAttachmentPermanentDeleteBlockedError,
  createAttachmentInvalidError,
} from '@kbn/agent-builder-common';
import type { AttachmentPublicClient, ListAttachmentsResult } from '@kbn/agent-builder-server';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ConversationService } from '../conversation';
import type { AttachmentServiceStart } from './types';
import { hasClientId, isAttachmentReferencedInRounds } from './attachment_guards';

interface Deps {
  request: KibanaRequest;
  conversationsService: ConversationService;
  attachmentsService: AttachmentServiceStart;
  coreStart: CoreStart;
  spaces?: SpacesPluginStart;
}

export const createAttachmentPublicClient = ({
  request,
  conversationsService,
  attachmentsService,
  coreStart,
  spaces,
}: Deps): AttachmentPublicClient => {
  const loadState = async (conversationId: string) => {
    const conversationClient = await conversationsService.getScopedClient({ request });
    const conversation = await conversationClient.get(conversationId);
    const stateManager = createAttachmentStateManager(conversation.attachments ?? [], {
      getTypeDefinition: attachmentsService.getTypeDefinition,
    });
    return { conversation, conversationClient, stateManager };
  };

  return {
    async list({ conversationId, includeDeleted }): Promise<ListAttachmentsResult> {
      const { stateManager } = await loadState(conversationId);
      const results = includeDeleted ? stateManager.getAll() : stateManager.getActive();
      return {
        results,
        total_token_estimate: stateManager.getTotalTokenEstimate(),
      };
    },

    async get({ conversationId, attachmentId }) {
      const { stateManager } = await loadState(conversationId);
      const record = stateManager.getAttachmentRecord(attachmentId);
      if (!record) {
        throw createAttachmentNotFoundError({ attachmentId });
      }
      return record;
    },

    async create({ conversationId, id, type, data, origin, description, hidden }) {
      const { conversationClient, stateManager } = await loadState(conversationId);

      if (id && stateManager.getAttachmentRecord(id)) {
        throw createAttachmentAlreadyExistsError({ attachmentId: id });
      }

      const spaceId = spaces?.spacesService.getSpaceId(request) ?? 'default';
      const resolveContext = {
        request,
        spaceId,
        savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
      };

      let attachment;
      try {
        attachment = await stateManager.add(
          { id, type, data, origin, description, hidden } as AttachmentInput,
          ATTACHMENT_REF_ACTOR.user,
          resolveContext,
          { request }
        );
      } catch (e) {
        throw createAttachmentInvalidError((e as Error).message);
      }

      await conversationClient.update({
        id: conversationId,
        attachments: stateManager.getAll(),
      });

      return attachment;
    },

    async update({ conversationId, attachmentId, data, description }) {
      const { conversationClient, stateManager } = await loadState(conversationId);
      const existing = stateManager.getAttachmentRecord(attachmentId);

      if (!existing) {
        throw createAttachmentNotFoundError({ attachmentId });
      }
      if (existing.active === false) {
        throw createAttachmentInvalidError(
          `Cannot update deleted attachment '${attachmentId}'. Restore it first.`
        );
      }

      let updated;
      try {
        updated = await stateManager.update(
          attachmentId,
          { data, description },
          ATTACHMENT_REF_ACTOR.user,
          { request }
        );
      } catch (e) {
        throw createAttachmentInvalidError((e as Error).message);
      }

      if (!updated) {
        throw createAttachmentInvalidError(`Failed to update attachment '${attachmentId}'`);
      }

      await conversationClient.update({
        id: conversationId,
        attachments: stateManager.getAll(),
      });

      return updated;
    },

    async delete({ conversationId, attachmentId, permanent }) {
      const { conversation, conversationClient, stateManager } = await loadState(conversationId);
      const existing = stateManager.getAttachmentRecord(attachmentId);

      if (!existing) {
        throw createAttachmentNotFoundError({ attachmentId });
      }
      if (existing.type === 'screen_context') {
        throw createAttachmentInvalidError('Screen context attachments cannot be deleted');
      }

      if (permanent) {
        if (hasClientId(existing)) {
          throw createAttachmentPermanentDeleteBlockedError({
            attachmentId,
            reason: 'client_id',
          });
        }
        if (isAttachmentReferencedInRounds(attachmentId, conversation.rounds)) {
          throw createAttachmentPermanentDeleteBlockedError({
            attachmentId,
            reason: 'referenced_in_rounds',
          });
        }

        const ok = stateManager.permanentDelete(attachmentId);
        if (!ok) {
          throw createAttachmentInvalidError(
            `Failed to permanently delete attachment '${attachmentId}'`
          );
        }
      } else {
        if (existing.active === false) {
          throw createAttachmentInvalidError(`Attachment '${attachmentId}' is already deleted`);
        }
        const ok = stateManager.delete(attachmentId, ATTACHMENT_REF_ACTOR.user);
        if (!ok) {
          throw createAttachmentInvalidError(`Failed to delete attachment '${attachmentId}'`);
        }
      }

      await conversationClient.update({
        id: conversationId,
        attachments: stateManager.getAll(),
      });
    },
  };
};
