/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type {
  Attachment,
  ConversationAttachment,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
  isAttachmentGroup,
} from '@kbn/agent-builder-common/attachments';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { useConversation } from '../../hooks/use_conversation';
import { RoundAttachmentReferences } from './conversation_rounds/round_attachment_references';

const getPendingAttachmentDescription = (attachment: ConversationAttachment): string => {
  if (isAttachmentGroup(attachment)) {
    return attachment.label;
  }

  if (attachment.description) {
    return attachment.description;
  }

  const dataDescription = (attachment.data as { description?: string } | undefined)?.description;
  if (dataDescription) {
    return dataDescription;
  }

  return attachment.type;
};

const toAttachmentForReferences = (attachment: ConversationAttachment): Attachment | null => {
  if (isAttachmentGroup(attachment)) {
    return {
      id: attachment.id,
      type: 'group',
      data: { label: attachment.label },
      description: attachment.label,
    };
  }

  if (!attachment.id) {
    return null;
  }

  return {
    id: attachment.id,
    type: attachment.type,
    data: (attachment.data ?? {}) as Record<string, unknown>,
    hidden: attachment.hidden,
    origin: attachment.origin,
    description: getPendingAttachmentDescription(attachment),
    ...(attachment.group_id !== undefined ? { groupId: attachment.group_id } : {}),
  };
};

const getPendingOnlyAttachments = (
  pendingAttachments: ConversationAttachment[] | undefined,
  conversationAttachments: VersionedAttachment[] | undefined
): ConversationAttachment[] => {
  if (!pendingAttachments?.length) {
    return [];
  }

  const serverIds = new Set((conversationAttachments ?? []).map((attachment) => attachment.id));

  return pendingAttachments.filter((attachment) => {
    if (isAttachmentGroup(attachment)) {
      return false;
    }

    return !attachment.id || !serverIds.has(attachment.id);
  });
};

export const StagedAttachmentSystemMessages: React.FC = () => {
  const { attachments: pendingAttachments } = useConversationContext();
  const { conversation } = useConversation();

  const pendingOnlyAttachments = useMemo(
    () => getPendingOnlyAttachments(pendingAttachments, conversation?.attachments),
    [conversation?.attachments, pendingAttachments]
  );

  const fallbackAttachments = useMemo(
    () =>
      pendingOnlyAttachments
        .map(toAttachmentForReferences)
        .filter((attachment): attachment is Attachment => attachment !== null),
    [pendingOnlyAttachments]
  );

  const attachmentRefs = useMemo(
    () =>
      fallbackAttachments.map((attachment) => ({
        attachment_id: attachment.id!,
        version: 1,
        operation: ATTACHMENT_REF_OPERATION.created,
        actor: ATTACHMENT_REF_ACTOR.system,
      })),
    [fallbackAttachments]
  );

  if (!fallbackAttachments.length) {
    return null;
  }

  return (
    <RoundAttachmentReferences
      attachmentRefs={attachmentRefs}
      fallbackAttachments={fallbackAttachments}
      actorFilter={[ATTACHMENT_REF_ACTOR.system]}
      includeHidden={true}
    />
  );
};
