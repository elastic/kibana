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
}

const labels = {
  attachments: i18n.translate('xpack.onechat.attachmentPillsRow.attachments', {
    defaultMessage: 'Attachments',
  }),
};

export const AttachmentPillsRow: React.FC<AttachmentPillsRowProps> = ({
  attachments,
  removable = false,
}) => {
  const { removeAttachment } = useConversationContext();

  if (attachments.length === 0) {
    return null;
  }

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
          onRemoveAttachment={removable ? () => removeAttachment?.(index) : undefined}
        />
      ))}
    </EuiBadgeGroup>
  );
};
