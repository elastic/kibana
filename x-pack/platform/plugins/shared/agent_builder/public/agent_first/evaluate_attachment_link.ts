/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ApplicationAttachmentLinkDescriptor } from '@kbn/agent-builder-browser';
import type {
  AttachmentInput,
  ConversationAttachment,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { getContentKey } from '@kbn/agent-builder-common/attachments';

export interface AttachmentLinkEvaluation {
  isLinked: boolean;
  linkedAttachmentId?: string;
  conversationTitle?: string;
}

const findPendingAttachmentId = ({
  pendingAttachments,
  linkDescriptor,
  attachmentInput,
}: {
  pendingAttachments: ConversationAttachment[];
  linkDescriptor?: ApplicationAttachmentLinkDescriptor;
  attachmentInput: AttachmentInput | null;
}): string | undefined => {
  if (linkDescriptor?.attachmentId) {
    const byId = pendingAttachments.find((attachment) => attachment.id === linkDescriptor.attachmentId);
    if (byId?.id) {
      return byId.id;
    }
  }

  if (linkDescriptor?.origin) {
    const byOrigin = pendingAttachments.find((attachment) => attachment.origin === linkDescriptor.origin);
    if (byOrigin?.id) {
      return byOrigin.id;
    }
  }

  if (!attachmentInput) {
    return undefined;
  }

  if (attachmentInput.id) {
    const byInputId = pendingAttachments.find((attachment) => attachment.id === attachmentInput.id);
    if (byInputId?.id) {
      return byInputId.id;
    }
  }

  if (attachmentInput.origin) {
    const byInputOrigin = pendingAttachments.find(
      (attachment) => attachment.origin === attachmentInput.origin
    );
    if (byInputOrigin?.id) {
      return byInputOrigin.id;
    }
  }

  const contentKey = getContentKey(attachmentInput, attachmentInput.id ?? attachmentInput.type);
  const byContentKey = pendingAttachments.find((attachment) => {
    if (!attachment.id) {
      return false;
    }

    return getContentKey(attachment as AttachmentInput, attachment.id) === contentKey;
  });

  return byContentKey?.id;
};

const findPersistedAttachmentId = ({
  persistedAttachments,
  linkDescriptor,
  attachmentInput,
}: {
  persistedAttachments: VersionedAttachment[];
  linkDescriptor?: ApplicationAttachmentLinkDescriptor;
  attachmentInput: AttachmentInput | null;
}): string | undefined => {
  if (linkDescriptor?.attachmentId) {
    const byId = persistedAttachments.find((attachment) => attachment.id === linkDescriptor.attachmentId);
    if (byId) {
      return byId.id;
    }
  }

  if (linkDescriptor?.origin) {
    const byOrigin = persistedAttachments.find(
      (attachment) => attachment.origin === linkDescriptor.origin
    );
    if (byOrigin) {
      return byOrigin.id;
    }
  }

  if (!attachmentInput) {
    return undefined;
  }

  if (attachmentInput.id) {
    const byInputId = persistedAttachments.find((attachment) => attachment.id === attachmentInput.id);
    if (byInputId) {
      return byInputId.id;
    }
  }

  if (attachmentInput.origin) {
    const byInputOrigin = persistedAttachments.find(
      (attachment) => attachment.origin === attachmentInput.origin
    );
    if (byInputOrigin) {
      return byInputOrigin.id;
    }
  }

  const contentKey = getContentKey(attachmentInput, attachmentInput.id ?? attachmentInput.type);
  const byContentKey = persistedAttachments.find(
    (attachment) => getContentKey(attachment as AttachmentInput, attachment.id) === contentKey
  );

  return byContentKey?.id;
};

export const evaluateAttachmentLink = ({
  attachmentInput,
  linkDescriptor,
  pendingAttachments,
  activeConversation,
}: {
  attachmentInput: AttachmentInput | null;
  linkDescriptor?: ApplicationAttachmentLinkDescriptor;
  pendingAttachments?: ConversationAttachment[];
  activeConversation: ActiveConversation | null;
}): AttachmentLinkEvaluation => {
  const conversationTitle = activeConversation?.conversation?.title;
  const pending = pendingAttachments ?? [];
  const persisted = activeConversation?.conversation?.attachments ?? [];

  const pendingAttachmentId = findPendingAttachmentId({
    pendingAttachments: pending,
    linkDescriptor,
    attachmentInput,
  });

  if (pendingAttachmentId) {
    return {
      isLinked: true,
      linkedAttachmentId: pendingAttachmentId,
      conversationTitle,
    };
  }

  const persistedAttachmentId = findPersistedAttachmentId({
    persistedAttachments: persisted,
    linkDescriptor,
    attachmentInput,
  });

  if (persistedAttachmentId) {
    return {
      isLinked: true,
      linkedAttachmentId: persistedAttachmentId,
      conversationTitle,
    };
  }

  return { isLinked: false, conversationTitle };
};
