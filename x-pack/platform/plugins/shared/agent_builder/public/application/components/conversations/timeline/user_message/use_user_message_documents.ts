/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Attachment,
  AttachmentVersionRef,
  AttachmentRefActor,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getVersion } from '@kbn/agent-builder-common/attachments';
import { useResolvedAttachmentReferences } from '../attachments/use_resolved_attachment_references';

export interface UseUserMessageDocumentsParams {
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
  actorFilter?: AttachmentRefActor[];
}

export interface UserMessageDocument {
  key: string;
  attachmentId: string;
  /** The file name, used to match the document with its badge in the message text. */
  name: string;
  mimeType?: string;
}

/** Resolves the document attachments of a user message that show as tiles in the bubble. */
export const useUserMessageDocuments = ({
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
  actorFilter,
}: UseUserMessageDocumentsParams): UserMessageDocument[] => {
  const allResolved = useResolvedAttachmentReferences({
    attachmentRefs,
    conversationAttachments,
    fallbackAttachments,
    actorFilter,
  });

  return allResolved.reduce<UserMessageDocument[]>((acc, { attachment, version }) => {
    if (attachment.type !== AttachmentType.document) {
      return acc;
    }
    const data = getVersion(attachment, version)?.data as
      | { name?: string; mime_type?: string }
      | undefined;
    acc.push({
      key: `${attachment.id}-v${version}`,
      attachmentId: attachment.id,
      name: data?.name ?? attachment.description ?? attachment.type,
      mimeType: data?.mime_type,
    });
    return acc;
  }, []);
};
