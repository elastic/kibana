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
import type { ResolvedReference } from '../attachments/use_resolved_attachment_references';
import { useResolvedAttachmentReferences } from '../attachments/use_resolved_attachment_references';
import { getFileAttachmentInfo } from '../../conversation_input/file_type';

export interface UseUserMessageFilesParams {
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
  actorFilter?: AttachmentRefActor[];
}

export interface UserMessageFile {
  key: string;
  attachmentId: string;
  /** The file name, used to match the file with its badge in the message text. */
  name: string;
  mimeType?: string;
  /** The place of the attachment among the attachments of the message. */
  order: number;
}

const getRefFileInfo = ({ attachment, version }: ResolvedReference) =>
  getFileAttachmentInfo({
    type: attachment.type,
    data: getVersion(attachment, version)?.data,
    description: attachment.description,
  });

/** Whether the attachment shows as a tile in the message bubble instead of in the references list. */
export const isTileAttachment = (ref: ResolvedReference): boolean =>
  ref.attachment.type === AttachmentType.image || getRefFileInfo(ref) !== undefined;

/** Resolves the file attachments of a user message that show as tiles in the bubble. */
export const useUserMessageFiles = ({
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
  actorFilter,
}: UseUserMessageFilesParams): UserMessageFile[] => {
  const allResolved = useResolvedAttachmentReferences({
    attachmentRefs,
    conversationAttachments,
    fallbackAttachments,
    actorFilter,
  });

  return allResolved.reduce<UserMessageFile[]>((acc, ref, order) => {
    const fileInfo = getRefFileInfo(ref);
    if (!fileInfo) {
      return acc;
    }
    const { attachment, version } = ref;
    acc.push({
      key: `${attachment.id}-v${version}`,
      attachmentId: attachment.id,
      name: fileInfo.name,
      mimeType: fileInfo.mimeType,
      order,
    });
    return acc;
  }, []);
};
