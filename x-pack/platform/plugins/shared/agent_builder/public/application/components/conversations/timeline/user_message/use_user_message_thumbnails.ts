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
import {
  AttachmentType,
  getVersion,
  isVersionedAttachmentOfType,
} from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../../hooks/use_agent_builder_service';
import type { ResolvedReference } from '../attachments/use_resolved_attachment_references';
import { useResolvedAttachmentReferences } from '../attachments/use_resolved_attachment_references';

export interface UseUserMessageThumbnailsParams {
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
  actorFilter?: AttachmentRefActor[];
}

export interface UserMessageThumbnail {
  key: string;
  attachmentId: string;
  thumbnailUrl: string;
  label: string;
  /** The `data.name` of the image, used to match it with its badge in the message text. */
  name?: string;
}

/** Resolves the image attachments of a user message that have a thumbnail to show. */
export const useUserMessageThumbnails = ({
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
  actorFilter,
}: UseUserMessageThumbnailsParams): UserMessageThumbnail[] => {
  const { attachmentsService } = useAgentBuilderServices();

  const allResolved = useResolvedAttachmentReferences({
    attachmentRefs,
    conversationAttachments,
    fallbackAttachments,
    actorFilter,
  });

  const imageRefs = allResolved.filter(
    (
      ref
    ): ref is ResolvedReference & {
      attachment: VersionedAttachment<AttachmentType.image>;
    } => isVersionedAttachmentOfType(ref.attachment, AttachmentType.image)
  );

  return imageRefs.reduce<UserMessageThumbnail[]>((acc, ref) => {
    const versionData = getVersion(ref.attachment, ref.version);
    if (!versionData) {
      return acc;
    }

    const uiDefinition = attachmentsService.getAttachmentUiDefinition(ref.attachment.type);
    const attachmentForUi = {
      id: ref.attachment.id,
      type: ref.attachment.type,
      data: versionData.data,
      ...(ref.attachment.description !== undefined
        ? { description: ref.attachment.description }
        : {}),
    };

    const thumbnailUrl = uiDefinition?.getThumbnail?.(attachmentForUi);
    if (!thumbnailUrl) {
      return acc;
    }

    const label =
      uiDefinition?.getLabel(attachmentForUi) ?? ref.attachment.description ?? ref.attachment.type;

    acc.push({
      key: `${ref.attachment.id}-v${ref.version}`,
      attachmentId: ref.attachment.id,
      thumbnailUrl,
      label,
      name: versionData.data.name,
    });
    return acc;
  }, []);
};
