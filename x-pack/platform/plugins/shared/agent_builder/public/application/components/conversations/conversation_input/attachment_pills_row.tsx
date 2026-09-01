/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  euiCanAnimate,
  useEuiTheme,
  type EuiFlexGroupProps,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, isAttachmentGroup } from '@kbn/agent-builder-common/attachments';
import { AttachmentPill } from './attachment_pill';
import { AttachmentGroupPill } from './attachment_group_pill';
import { useConversationContext } from '../../../context/conversation/conversation_context';

export interface AttachmentPillsRowProps {
  attachments: ConversationAttachment[];
  removable?: boolean;
  justifyContent?: EuiFlexGroupProps['justifyContent'];
  onRemoveAttachment?: (attachment: ConversationAttachment) => void;
  uploadingNames?: Set<string>;
  hoveredImageName?: string | null;
}

const indeterminateProgressSweep = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
`;

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
        width: 72px;
        height: 32px;
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
          border-radius: 999px;
          background: ${euiTheme.colors.backgroundLightText};
          overflow: hidden;
        `}
      >
        <div
          css={css`
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 40%;
            border-radius: 999px;
            background: ${euiTheme.colors.backgroundFilledText};
            ${euiCanAnimate} {
              animation: ${indeterminateProgressSweep} 1.4s ease-in-out infinite;
            }
          `}
        />
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
  hoveredImageName,
}) => {
  const { removeAttachment } = useConversationContext();
  const uploadingEntries = uploadingNames ? [...uploadingNames] : [];

  if (attachments.length === 0 && uploadingEntries.length === 0) {
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
        const imageName =
          attachment.type === AttachmentType.image
            ? (attachment.data as { name?: string }).name
            : undefined;
        return (
          <EuiFlexItem key={attachmentId} grow={false} role="listitem">
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
            />
          </EuiFlexItem>
        );
      })}
      {uploadingEntries.map((name) => (
        <EuiFlexItem key={`uploading-${name}`} grow={false} role="listitem">
          <UploadingImagePill name={name} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
