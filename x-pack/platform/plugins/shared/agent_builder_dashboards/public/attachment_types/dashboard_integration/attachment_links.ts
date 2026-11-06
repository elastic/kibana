/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { ConversationTracker } from './conversation_tracker';

/** Which attachment of a conversation each dashboard was applied from or staged as. */
export const createAttachmentLinks = (conversation: ConversationTracker) => {
  // per conversation id, where `undefined` is a new conversation
  const linksByConversation = new Map<string | undefined, WeakMap<DashboardApi, string>>();
  let nextDashboardLink:
    | { fromApi: DashboardApi; conversationSwitch: number; attachmentId: string }
    | undefined;

  const getLinkedAttachmentId = (api: DashboardApi) =>
    linksByConversation.get(conversation.getActiveId())?.get(api);

  const setLinkedAttachmentId = (api: DashboardApi, attachmentId: string) => {
    const conversationId = conversation.getActiveId();
    const links = linksByConversation.get(conversationId) ?? new WeakMap();
    links.set(api, attachmentId);
    linksByConversation.set(conversationId, links);
  };

  return {
    getLinkedAttachmentId,
    setLinkedAttachmentId,
    /** A new conversation that got its id keeps its links. */
    adoptNewConversationLinks: (conversationId: string) => {
      const newConversationLinks = linksByConversation.get(undefined);
      linksByConversation.delete(undefined);
      if (newConversationLinks && !linksByConversation.has(conversationId)) {
        linksByConversation.set(conversationId, newConversationLinks);
      }
    },
    isLinkedInOtherConversation: (api: DashboardApi, draftAttachmentId: string) =>
      [...linksByConversation].some(([conversationId, links]) => {
        const linkedAttachmentId = links.get(api);
        return (
          conversationId !== conversation.getActiveId() &&
          linkedAttachmentId !== undefined &&
          linkedAttachmentId !== draftAttachmentId
        );
      }),
    linkNextDashboard: (fromApi: DashboardApi, attachmentId: string) => {
      nextDashboardLink = {
        fromApi,
        conversationSwitch: conversation.getSwitchCount(),
        attachmentId,
      };
    },
    claimNextDashboardLink: (api: DashboardApi) => {
      // the dashboard that set the link is published again when the chat reopens
      if (!nextDashboardLink || nextDashboardLink.fromApi === api) {
        return;
      }
      const { conversationSwitch, attachmentId } = nextDashboardLink;
      nextDashboardLink = undefined;
      if (conversationSwitch === conversation.getSwitchCount() && !api.savedObjectId$.getValue()) {
        setLinkedAttachmentId(api, attachmentId);
      }
    },
  };
};
