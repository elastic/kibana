/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentInput,
  ConversationAttachment,
  UnknownAttachment,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { getLatestVersion, isAttachmentGroup } from '@kbn/agent-builder-common/attachments';

const GROUP_ATTACHMENT_TYPE = 'group';

export const isVersionedConversationAttachment = (
  attachment: ConversationAttachment | VersionedAttachment
): attachment is VersionedAttachment => {
  return 'versions' in attachment && Array.isArray(attachment.versions);
};

/**
 * Maps a merged conversation attachment entry to UnknownAttachment for cart display.
 * Returns null for hidden entries or entries without enough metadata to render a card.
 */
export const toUnknownAttachmentForCart = (
  attachment: ConversationAttachment | VersionedAttachment
): UnknownAttachment | null => {
  if (isVersionedConversationAttachment(attachment)) {
    if (attachment.hidden) {
      return null;
    }

    const latest = getLatestVersion(attachment);
    if (!latest) {
      return null;
    }

    return {
      id: attachment.id,
      type: attachment.type,
      data: latest.data,
      hidden: attachment.hidden,
      origin: attachment.origin,
      version: attachment.current_version,
      versionCount: attachment.versions.length,
      description: attachment.description,
      groupId: attachment.group_id,
    };
  }

  if (isAttachmentGroup(attachment)) {
    return {
      id: attachment.id,
      type: GROUP_ATTACHMENT_TYPE,
      data: { label: attachment.label },
    };
  }

  const input = attachment as AttachmentInput;
  if (input.hidden || !input.id) {
    return null;
  }

  return {
    id: input.id,
    type: input.type,
    data: input.data ?? {},
    origin: input.origin,
    hidden: input.hidden,
    description: input.description,
    groupId: input.group_id,
  };
};

export const mapAttachmentsForCart = (
  attachments: Array<ConversationAttachment | VersionedAttachment>
): UnknownAttachment[] => {
  return attachments
    .map(toUnknownAttachmentForCart)
    .filter((attachment): attachment is UnknownAttachment => attachment !== null);
};
