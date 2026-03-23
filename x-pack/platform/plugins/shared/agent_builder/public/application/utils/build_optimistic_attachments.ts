/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentInput,
  Attachment,
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
  getLatestVersion,
  hashContent,
} from '@kbn/agent-builder-common/attachments';

export const buildOptimisticAttachments = ({
  attachments,
  conversationAttachments,
}: {
  attachments?: AttachmentInput[];
  conversationAttachments?: VersionedAttachment[];
}): { fallbackAttachments: Attachment[]; attachmentRefs: AttachmentVersionRef[] } => {
  if (!attachments?.length) {
    return { fallbackAttachments: [], attachmentRefs: [] };
  }

  const existingById = new Map<string, VersionedAttachment>();
  const existingByContentKey = new Map<string, string>();

  for (const existing of conversationAttachments ?? []) {
    const latest = getLatestVersion(existing);
    if (!latest) continue;
    existingById.set(existing.id, existing);
    existingByContentKey.set(`${existing.type}:${latest.content_hash}`, existing.id);
  }

  const fallbackAttachments: Attachment[] = [];
  const attachmentRefs: AttachmentVersionRef[] = [];

  attachments.forEach((input, index) => {
    const inputId = input.id;
    if (inputId && existingById.has(inputId)) {
      const existing = existingById.get(inputId)!;
      attachmentRefs.push({
        attachment_id: inputId,
        version: existing.current_version + 1,
        operation: ATTACHMENT_REF_OPERATION.updated,
        actor: ATTACHMENT_REF_ACTOR.user,
      });
      return;
    }

    const contentHash = hashContent(input.data);
    const contentKey = `${input.type}:${contentHash}`;
    if (existingByContentKey.has(contentKey)) {
      return;
    }

    const createdId = inputId ?? `pending-attachment-${index}`;
    fallbackAttachments.push({
      id: createdId,
      type: input.type,
      data: input.data,
      ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
    });
    attachmentRefs.push({
      attachment_id: createdId,
      version: 1,
      operation: ATTACHMENT_REF_OPERATION.created,
      actor: ATTACHMENT_REF_ACTOR.user,
    });
    existingByContentKey.set(contentKey, createdId);
  });

  return { fallbackAttachments, attachmentRefs };
};
