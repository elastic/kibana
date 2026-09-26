/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AttachmentEventSource, Conversation } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import {
  createAttachmentNotFoundError,
  createAttachmentAlreadyExistsError,
  createAttachmentPermanentDeleteBlockedError,
  createAttachmentInvalidError,
} from '@kbn/agent-builder-common';
import type { AttachmentPublicClient, ListAttachmentsResult } from '@kbn/agent-builder-server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  attachmentChangesToEvents,
  createAttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { ConversationClient, ConversationService } from '../conversation';
import { userMessageActor } from '../conversation/client/rounds_to_events';
import type { AttachmentServiceStart } from './types';
import { hasClientId, isAttachmentReferencedInRounds } from './attachment_guards';

/**
 * The `source` recorded on attachment events emitted from the public client. Bound once when the
 * client is constructed (see {@link createAttachmentPublicClient}) so external callers reaching
 * the client through `AttachmentsStart.getScopedClient` cannot misattribute their mutations —
 * they never see this type and cannot override it per call.
 */
export type AttachmentPublicClientSource = Extract<
  AttachmentEventSource,
  'http_api' | 'workflow' | 'server_api'
>;

interface Deps {
  request: KibanaRequest;
  conversationsService: ConversationService;
  attachmentsService: AttachmentServiceStart;
  coreStart: CoreStart;
  spaces?: SpacesPluginStart;
  /**
   * Bound at construction: recorded as `source` on every attachment event this client emits.
   * Routes pass `'http_api'`, workflow steps pass `'workflow'`, `AttachmentsStart.getScopedClient`
   * in `plugin.ts` passes `'server_api'` for external plugin callers.
   */
  source: AttachmentPublicClientSource;
}

export const createAttachmentPublicClient = ({
  request,
  conversationsService,
  attachmentsService,
  coreStart,
  spaces,
  source,
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
   * event but still go through `appendEvents` so `reconcileAttachments` runs (race-safe).
   */
  const persist = async ({
    conversation,
    conversationClient,
    stateManager,
    renderInline = false,
  }: {
    conversation: Conversation;
    conversationClient: ConversationClient;
    stateManager: AttachmentStateManager;
    renderInline?: boolean;
  }) => {
    const changes = stateManager.drainChanges();
    // The caller's identity: the authenticated Kibana user behind the HTTP request, or the user
    // a workflow executes as (steps pass the workflow's fake request). When the caller has no
    // profile id (some API-key callers), pass `undefined` as the conversation to
    // `userMessageActor` so its owner fallback does NOT fire — we would rather stamp the honest
    // `id: 'unknown'` than lie by attributing the mutation to the conversation owner.
    const author = conversationClient.getAuthor();
    const actor = userMessageActor(author ? conversation : undefined, { author });
    const events =
      changes.length > 0
        ? attachmentChangesToEvents(changes, { source, actor, render_inline: renderInline })
        : [];
    // Route the write through `appendEvents` in both cases (with or without events): it's the only
    // path that runs `reconcileAttachments` against the caller's snapshot, so a concurrent
    // add/delete between `loadState` and this write can't be silently clobbered. `appendEvents`
    // defaults to `converse` access; `owner` keeps the original permission check.
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

      await persist({ conversation, conversationClient, stateManager, renderInline });

      return attachment;
    },

    async update({ conversationId, attachmentId, data, description, render_inline: renderInline }) {
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

      await persist({ conversation, conversationClient, stateManager, renderInline });

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

      await persist({ conversation, conversationClient, stateManager });
    },
  };
};
