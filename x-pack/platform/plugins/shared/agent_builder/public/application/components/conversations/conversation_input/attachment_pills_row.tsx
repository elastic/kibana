/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  useEuiTheme,
  type EuiFlexGroupProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, isAttachmentGroup } from '@kbn/agent-builder-common/attachments';
import { AttachmentPill } from './attachment_pill';
import { AttachmentGroupPill } from './attachment_group_pill';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

export interface AttachmentPillsRowProps {
  attachments: ConversationAttachment[];
  removable?: boolean;
  justifyContent?: EuiFlexGroupProps['justifyContent'];
  onRemoveAttachment?: (attachment: ConversationAttachment) => void;
  uploadingNames?: Set<string>;
  hoveredImageName?: string | null;
  onHoverImageName?: (name: string | null) => void;
}

const UploadingImagePill: React.FC<{ name: string }> = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        width: 72px;
        height: 32px;
        border-radius: ${euiTheme.border.radius.medium};
        background: ${euiTheme.colors.backgroundBaseSubdued};
        overflow: hidden;
        display: flex;
        align-items: center;
        padding: 0 ${euiTheme.size.s};
      `}
    >
      <EuiProgress size="s" style={{ width: '100%' }} />
    </div>
  );
};

const labels = {
  attachments: i18n.translate('xpack.agentBuilder.attachmentPillsRow.attachments', {
    defaultMessage: 'Attachments',
  }),
};

export const AttachmentPillsRow: React.FC<AttachmentPillsRowProps> = ({
  attachments,
  removable = false,
  justifyContent = 'flexStart',
  onRemoveAttachment,
  uploadingNames,
  hoveredImageName,
  onHoverImageName,
}) => {
  const { removeAttachment } = useConversationContext();
  const { attachmentsService } = useAgentBuilderServices();

  const pillAttachments = attachments.filter((attachment) => {
    if (isAttachmentGroup(attachment)) return true;
    return Boolean(attachmentsService.getAttachmentUiDefinition(attachment.type)?.getPillThumbnail);
  });

  const uploadingEntries = uploadingNames ? [...uploadingNames] : [];

  if (pillAttachments.length === 0 && uploadingEntries.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="s"
      wrap
      responsive={false}
      justifyContent={justifyContent}
      role="list"
      aria-label={labels.attachments}
      data-test-subj="agentBuilderAttachmentPillsRow"
    >
      {pillAttachments.map((attachment, index) => {
        if (isAttachmentGroup(attachment)) {
          return (
            <EuiFlexItem key={attachment.id} grow={false}>
              <AttachmentGroupPill
                group={attachment}
                onRemove={
                  removable
                    ? () =>
                        onRemoveAttachment
                          ? onRemoveAttachment(attachment)
                          : removeAttachment?.(index)
                    : undefined
                }
              />
            </EuiFlexItem>
          );
        }

        const attachmentId = attachment.id ?? `${attachment.type}-${index}`;
        const imageName =
          attachment.type === AttachmentType.image
            ? (attachment.data as { name?: string }).name
            : undefined;
        return (
          <EuiFlexItem key={attachmentId} grow={false}>
            <AttachmentPill
              attachment={{
                id: attachmentId,
                type: attachment.type,
                data: (attachment.data ?? {}) as Record<string, unknown>,
                hidden: attachment.hidden,
                origin: attachment.origin,
              }}
              onRemoveAttachment={
                removable
                  ? () =>
                      onRemoveAttachment
                        ? onRemoveAttachment(attachment)
                        : removeAttachment?.(index)
                  : undefined
              }
              isHighlighted={Boolean(imageName && hoveredImageName === imageName)}
              onHoverStart={imageName ? () => onHoverImageName?.(imageName) : undefined}
              onHoverEnd={imageName ? () => onHoverImageName?.(null) : undefined}
            />
          </EuiFlexItem>
        );
      })}
      {uploadingEntries.map((name) => (
        <EuiFlexItem key={`uploading-${name}`} grow={false}>
          <UploadingImagePill name={name} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
