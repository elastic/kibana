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
}

const getFileData = ({ attachment, version }: ResolvedReference) =>
  getVersion(attachment, version)?.data as { name?: string; mime_type?: string } | undefined;

/** A binary attachment, or a text attachment that comes from a file (it has a name). */
const isFileAttachment = (ref: ResolvedReference): boolean =>
  ref.attachment.type === AttachmentType.binary ||
  (ref.attachment.type === AttachmentType.text && Boolean(getFileData(ref)?.name));

/** Whether the attachment shows as a tile in the message bubble instead of in the references list. */
export const isTileAttachment = (ref: ResolvedReference): boolean =>
  ref.attachment.type === AttachmentType.image || isFileAttachment(ref);

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

  return allResolved.reduce<UserMessageFile[]>((acc, ref) => {
    if (!isFileAttachment(ref)) {
      return acc;
    }
    const { attachment, version } = ref;
    const data = getFileData(ref);
    acc.push({
      key: `${attachment.id}-v${version}`,
      attachmentId: attachment.id,
      name: data?.name ?? attachment.description ?? attachment.type,
      mimeType: data?.mime_type,
    });
    return acc;
  }, []);
};
