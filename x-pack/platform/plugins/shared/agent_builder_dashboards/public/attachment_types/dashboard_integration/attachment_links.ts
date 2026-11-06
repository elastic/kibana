/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { ConversationTracker } from './conversation_tracker';

// a navigation that was cancelled, e.g. at the unsaved changes prompt, never opens the dashboard
// the link was left for, so a dashboard opened later must not take it over
export const NEXT_DASHBOARD_LINK_TTL_MS = 60000;

/** Which attachment of a conversation each dashboard was applied from or staged as. */
export const createAttachmentLinks = (conversation: ConversationTracker) => {
  // per conversation id, where `undefined` is a new conversation
  const linksByConversation = new Map<string | undefined, WeakMap<DashboardApi, string>>();
  let nextDashboardLink:
    | { fromApi: DashboardApi; conversationSwitch: number; attachmentId: string; expiresAt: number }
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
        expiresAt: Date.now() + NEXT_DASHBOARD_LINK_TTL_MS,
      };
    },
    claimNextDashboardLink: (api: DashboardApi) => {
      // the dashboard that set the link is published again when the chat reopens
      if (!nextDashboardLink || nextDashboardLink.fromApi === api) {
        return;
      }
      const { conversationSwitch, attachmentId, expiresAt } = nextDashboardLink;
      nextDashboardLink = undefined;
      if (
        Date.now() < expiresAt &&
        conversationSwitch === conversation.getSwitchCount() &&
        !api.savedObjectId$.getValue()
      ) {
        setLinkedAttachmentId(api, attachmentId);
      }
    },
  };
};
