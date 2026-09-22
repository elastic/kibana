/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
import { ThumbnailAttachmentPill } from '../conversation_input/thumbnail_attachment_pill';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import type { ResolvedReference } from './use_resolved_attachment_references';
import { useResolvedAttachmentReferences } from './use_resolved_attachment_references';

export interface RoundInputImagesProps {
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
  actorFilter?: AttachmentRefActor[];
  /** When set, the thumbnail whose data.name matches is highlighted. */
  hoveredImageName?: string | null;
}

interface ThumbnailInfo {
  key: string;
  attachmentId: string;
  thumbnailUrl: string;
  label: string;
  isHighlighted: boolean;
}

export const RoundInputImages: React.FC<RoundInputImagesProps> = ({
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
  actorFilter,
  hoveredImageName,
}) => {
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

  const thumbnails = imageRefs.reduce<ThumbnailInfo[]>((acc, ref) => {
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
      isHighlighted: hoveredImageName != null && hoveredImageName === versionData.data.name,
    });
    return acc;
  }, []);

  if (thumbnails.length === 0) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="row" wrap responsive={false} gutterSize="s">
        {thumbnails.map(({ key, ...pillProps }) => (
          <EuiFlexItem grow={false} key={key}>
            <ThumbnailAttachmentPill {...pillProps} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
