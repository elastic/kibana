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
import type { AttachmentPublicClient, ListAttachmentsResult } from '@kbn/agent-builder-server';
import {
  AttachmentNotFoundError,
  AttachmentConflictError,
  AttachmentValidationError,
} from '@kbn/agent-builder-server';
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
    async list(conversationId, options): Promise<ListAttachmentsResult> {
      const { stateManager } = await loadState(conversationId);
      const results = options?.includeDeleted ? stateManager.getAll() : stateManager.getActive();
      return {
        results,
        total_token_estimate: stateManager.getTotalTokenEstimate(),
      };
    },

    async get(conversationId, attachmentId) {
      const { stateManager } = await loadState(conversationId);
      const record = stateManager.getAttachmentRecord(attachmentId);
      if (!record) {
        throw new AttachmentNotFoundError(attachmentId);
      }
      return record;
    },
    async create(conversationId, input) {
      const { conversationClient, stateManager } = await loadState(conversationId);

      if (input.id && stateManager.getAttachmentRecord(input.id)) {
        throw new AttachmentConflictError(`Attachment with ID '${input.id}' already exists`);
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
          input as AttachmentInput,
          ATTACHMENT_REF_ACTOR.user,
          resolveContext
        );
      } catch (e) {
        throw new AttachmentValidationError((e as Error).message);
      }

      await conversationClient.update({
        id: conversationId,
        attachments: stateManager.getAll(),
      });

      return attachment;
    },
    async update(conversationId, attachmentId, input) {
      const { conversationClient, stateManager } = await loadState(conversationId);
      const existing = stateManager.getAttachmentRecord(attachmentId);

      if (!existing) {
        throw new AttachmentNotFoundError(attachmentId);
      }
      if (existing.active === false) {
        throw new AttachmentValidationError(
          `Cannot update deleted attachment '${attachmentId}'. Restore it first.`
        );
      }

      let updated;
      try {
        updated = await stateManager.update(attachmentId, input, ATTACHMENT_REF_ACTOR.user);
      } catch (e) {
        throw new AttachmentValidationError((e as Error).message);
      }

      if (!updated) {
        throw new AttachmentValidationError(`Failed to update attachment '${attachmentId}'`);
      }

      await conversationClient.update({
        id: conversationId,
        attachments: stateManager.getAll(),
      });

      return updated;
    },
    async delete(conversationId, attachmentId, options) {
      const { conversation, conversationClient, stateManager } = await loadState(conversationId);
      const existing = stateManager.getAttachmentRecord(attachmentId);

      if (!existing) {
        throw new AttachmentNotFoundError(attachmentId);
      }
      if (existing.type === 'screen_context') {
        throw new AttachmentValidationError('Screen context attachments cannot be deleted');
      }

      if (options?.permanent) {
        if (hasClientId(existing)) {
          throw new AttachmentConflictError(
            `Cannot permanently delete attachment '${attachmentId}' because it was created from flyout configuration`
          );
        }
        if (isAttachmentReferencedInRounds(attachmentId, conversation.rounds)) {
          throw new AttachmentConflictError(
            `Cannot permanently delete attachment '${attachmentId}' because it is referenced in conversation rounds`
          );
        }

        const ok = stateManager.permanentDelete(attachmentId);
        if (!ok) {
          throw new AttachmentValidationError(
            `Failed to permanently delete attachment '${attachmentId}'`
          );
        }
      } else {
        if (existing.active === false) {
          throw new AttachmentValidationError(`Attachment '${attachmentId}' is already deleted`);
        }
        const ok = stateManager.delete(attachmentId, ATTACHMENT_REF_ACTOR.user);
        if (!ok) {
          throw new AttachmentValidationError(`Failed to delete attachment '${attachmentId}'`);
        }
      }

      await conversationClient.update({
        id: conversationId,
        attachments: stateManager.getAll(),
      });
    },
  };
};
