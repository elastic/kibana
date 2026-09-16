/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { Conversation } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import {
  createAttachmentNotFoundError,
  createAttachmentAlreadyExistsError,
  createAttachmentPermanentDeleteBlockedError,
  createAttachmentInvalidError,
} from '@kbn/agent-builder-common';
import type {
  AttachmentPublicClient,
  AttachmentPublicClientSource,
  ListAttachmentsResult,
} from '@kbn/agent-builder-server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  attachmentChangesToEvents,
  createAttachmentStateManager,
  systemEventActor,
} from '@kbn/agent-builder-server/attachments';
import type { ConversationClient, ConversationService } from '../conversation';
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

  /**
   * Persists the state manager's attachments and, when something was created, versioned or
   * deleted, the matching attachment events in the same write. Metadata-only changes have no
   * event and fall back to a plain attachments update.
   */
  const persist = async ({
    conversation,
    conversationClient,
    stateManager,
    source,
    renderInline = false,
  }: {
    conversation: Conversation;
    conversationClient: ConversationClient;
    stateManager: AttachmentStateManager;
    source: AttachmentPublicClientSource;
    renderInline?: boolean;
  }) => {
    const changes = stateManager.drainChanges();
    if (changes.length === 0) {
      await conversationClient.update({ id: conversation.id, attachments: stateManager.getAll() });
      return;
    }
    const events = attachmentChangesToEvents(changes, {
      source,
      actor: systemEventActor,
      render_inline: renderInline,
    });
    // `appendEvents` defaults to `converse` access; `owner` keeps the permission check identical
    // to the `update` call it replaces.
    await conversationClient.appendEvents(
      {
        id: conversation.id,
        events,
        attachments: { snapshot: conversation.attachments ?? [], produced: stateManager.getAll() },
      },
      { access: 'owner' }
    );
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

    async create({
      conversationId,
      id,
      type,
      data,
      origin,
      description,
      hidden,
      source,
      render_inline: renderInline,
    }) {
      const { conversation, conversationClient, stateManager } = await loadState(conversationId);

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

      await persist({ conversation, conversationClient, stateManager, source, renderInline });

      return attachment;
    },

    async update({
      conversationId,
      attachmentId,
      data,
      description,
      source,
      render_inline: renderInline,
    }) {
      const { conversation, conversationClient, stateManager } = await loadState(conversationId);
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

      await persist({ conversation, conversationClient, stateManager, source, renderInline });

      return updated;
    },

    async delete({ conversationId, attachmentId, permanent, source }) {
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

      await persist({ conversation, conversationClient, stateManager, source });
    },
  };
};
