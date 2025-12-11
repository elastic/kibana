/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadgeGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { Attachment, AttachmentInput } from '@kbn/onechat-common/attachments';
import { AttachmentPill } from './attachment_pill';
import { useConversationContext } from '../../../context/conversation/conversation_context';

export interface AttachmentPillsRowProps {
  attachments: AttachmentInput[] | Attachment[];
  removable?: boolean;
  onAttachmentClick?: (attachmentId: string) => void;
  /** Custom remove handler - if provided, overrides the default context removeAttachment */
  onRemoveAttachment?: (attachmentId: string, index: number) => void;
}

const labels = {
  attachments: i18n.translate('xpack.onechat.attachmentPillsRow.attachments', {
    defaultMessage: 'Attachments',
  }),
};

export const AttachmentPillsRow: React.FC<AttachmentPillsRowProps> = ({
  attachments,
  removable = false,
  onAttachmentClick,
  onRemoveAttachment,
}) => {
  const { removeAttachment: contextRemoveAttachment } = useConversationContext();

  if (attachments.length === 0) {
    return null;
  }

  // Create a remove handler that uses the custom handler if provided, otherwise falls back to context
  const handleRemove = (attachmentId: string | undefined, index: number) => {
    if (onRemoveAttachment && attachmentId) {
      onRemoveAttachment(attachmentId, index);
    } else {
      contextRemoveAttachment?.(index);
    }
  };

  return (
    <EuiBadgeGroup
      gutterSize="s"
      role="list"
      aria-label={labels.attachments}
      data-test-subj="onechatAttachmentPillsRow"
    >
      {attachments.map((attachment, index) => (
        <AttachmentPill
          key={attachment.id ?? `${attachment.type}-${index}`}
          attachment={attachment as Attachment}
          onRemoveAttachment={removable ? () => handleRemove(attachment.id, index) : undefined}
          onClick={
            onAttachmentClick && attachment.id ? () => onAttachmentClick(attachment.id!) : undefined
          }
        />
      ))}
    </EuiBadgeGroup>
  );
};
