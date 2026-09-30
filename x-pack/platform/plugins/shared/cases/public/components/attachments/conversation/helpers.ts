/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import { AGENTBUILDER_APP_ID } from '@kbn/agent-builder-plugin/public';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type { AttachmentUIV2, CaseUI } from '../../../../common/ui/types';
import type { ConversationSummary } from '../../../../common/types/api/agent_builder/v1';
import type { ConversationAttachmentMetadata } from '../../../../common/types/domain_zod/attachment/conversation/v2';

export type ConversationAttachmentUI = AttachmentUIV2 & {
  attachmentId: string;
  metadata?: ConversationAttachmentMetadata | null;
};

export const isConversationAttachment = (
  attachment: AttachmentUIV2
): attachment is ConversationAttachmentUI =>
  attachment.type === AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE &&
  'attachmentId' in attachment &&
  typeof attachment.attachmentId === 'string';

export const getConversationAttachmentIds = (comments: AttachmentUIV2[]): string[] =>
  Array.from(
    new Set(comments.filter(isConversationAttachment).map(({ attachmentId }) => attachmentId))
  ).sort();

/**
 * Drops conversation attachments the viewer cannot open and refreshes the title
 * and agent of the ones they can, so every consumer of `caseData.comments`
 * (activity feed, Attachments tab, counts, filters) sees the same visible set.
 * Until the access result arrives (`accessible` undefined) all conversation
 * attachments are hidden.
 */
export const applyConversationAccess = (
  caseData: CaseUI,
  accessible: Map<string, ConversationSummary> | undefined
): CaseUI => {
  if (!caseData.comments.some(isConversationAttachment)) {
    return caseData;
  }

  return {
    ...caseData,
    comments: caseData.comments.flatMap((comment) => {
      if (!isConversationAttachment(comment)) {
        return [comment];
      }
      const live = accessible?.get(comment.attachmentId);
      return live
        ? [
            {
              ...comment,
              metadata: { ...comment.metadata, title: live.title, agentId: live.agent_id },
            },
          ]
        : [];
    }),
  };
};

export const getConversationHref = (
  application: ApplicationStart,
  { agentId, conversationId }: { agentId: string; conversationId: string }
): string =>
  application.getUrlForApp(AGENTBUILDER_APP_ID, {
    path: `/agents/${agentId}/conversations/${conversationId}`,
  });
