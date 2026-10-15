/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme, type EuiFlexGroupProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, isAttachmentGroup } from '@kbn/agent-builder-common/attachments';
import { AttachmentPill } from './attachment_pill';
import { AttachmentGroupPill } from './attachment_group_pill';
import { getTextFileName } from './file_type';
import type { LoadingFile } from './use_attachment_uploads';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import {
  ATTACHMENT_PILL_WIDTH,
  ATTACHMENT_PILL_HEIGHT,
  imageUploadProgressFillStyles,
  imageUploadProgressTrackColorStyles,
} from './image_upload_styles';

export interface AttachmentPillsRowProps {
  attachments: ConversationAttachment[];
  removable?: boolean;
  justifyContent?: EuiFlexGroupProps['justifyContent'];
  onRemoveAttachment?: (attachment: ConversationAttachment) => void;
  uploadingNames?: Set<string>;
  loadingFiles?: readonly LoadingFile[];
  onRemoveLoadingFile?: (name: string) => void;
  hoveredAttachmentName?: string | null;
}

const UploadingImagePill: React.FC<{ name: string }> = ({ name }) => {
  const { euiTheme } = useEuiTheme();
  const label = i18n.translate('xpack.agentBuilder.attachmentPillsRow.uploadingLabel', {
    defaultMessage: 'Uploading {name}',
    values: { name },
  });
  return (
    <div
      role="status"
      aria-label={label}
      css={css`
        position: relative;
        width: ${ATTACHMENT_PILL_WIDTH}px;
        height: ${ATTACHMENT_PILL_HEIGHT}px;
        border-radius: ${euiTheme.border.radius.small};
        background: ${euiTheme.colors.backgroundBaseSubdued};
        overflow: hidden;
        flex-shrink: 0;
      `}
      data-test-subj={`agentBuilderUploadingPill-${name}`}
    >
      <div
        css={css`
          position: absolute;
          bottom: 4px;
          left: 4px;
          right: 4px;
          height: 2px;
          ${imageUploadProgressTrackColorStyles(euiTheme)}
        `}
      >
        <div css={imageUploadProgressFillStyles(euiTheme)} />
      </div>
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
  loadingFiles,
  onRemoveLoadingFile,
  hoveredAttachmentName,
}) => {
  const { removeAttachment } = useConversationContext();
  const uploadingEntries = uploadingNames ? [...uploadingNames] : [];
  const loadingFileEntries = loadingFiles ?? [];

  if (
    attachments.length === 0 &&
    uploadingEntries.length === 0 &&
    loadingFileEntries.length === 0
  ) {
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
      {attachments.map((attachment, index) => {
        if (isAttachmentGroup(attachment)) {
          return (
            <EuiFlexItem key={attachment.id} grow={false} role="listitem">
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
        const fileName =
          attachment.type === AttachmentType.image || attachment.type === AttachmentType.binary
            ? (attachment.data as { name?: string } | undefined)?.name ?? attachment.description
            : getTextFileName(attachment);
        return (
          <EuiFlexItem key={attachmentId} grow={false} role="listitem">
            <AttachmentPill
              attachment={{
                id: attachmentId,
                type: attachment.type,
                data: (attachment.data ?? {}) as Record<string, unknown>,
                hidden: attachment.hidden,
                origin: attachment.origin,
                description: attachment.description,
              }}
              onRemoveAttachment={
                removable
                  ? () =>
                      onRemoveAttachment
                        ? onRemoveAttachment(attachment)
                        : removeAttachment?.(index)
                  : undefined
              }
              isHighlighted={Boolean(fileName && hoveredAttachmentName === fileName)}
            />
          </EuiFlexItem>
        );
      })}
      {loadingFileEntries.map(({ name, kind }) => (
        <EuiFlexItem key={`loading-file-${name}`} grow={false} role="listitem">
          <AttachmentPill
            attachment={{
              id: name,
              type: kind === 'text' ? AttachmentType.text : AttachmentType.binary,
              data: kind === 'text' ? { content: '', name } : {},
              description: name,
            }}
            isLoading
            isHighlighted={hoveredAttachmentName === name}
            onRemoveAttachment={removable ? () => onRemoveLoadingFile?.(name) : undefined}
          />
        </EuiFlexItem>
      ))}
      {uploadingEntries.map((name) => (
        <EuiFlexItem key={`uploading-${name}`} grow={false} role="listitem">
          <UploadingImagePill name={name} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
