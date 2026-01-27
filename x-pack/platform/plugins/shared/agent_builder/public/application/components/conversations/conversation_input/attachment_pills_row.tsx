/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, type EuiFlexGroupProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { AttachmentPill } from './attachment_pill';
import { useConversationContext } from '../../../context/conversation/conversation_context';

export interface AttachmentPillsRowProps {
  attachments: AttachmentInput[] | Attachment[];
  removable?: boolean;
  justifyContent?: EuiFlexGroupProps['justifyContent'];
}

const labels = {
  attachments: i18n.translate('xpack.agentBuilder.attachmentPillsRow.attachments', {
    defaultMessage: 'Attachments',
  }),
};

export const AttachmentPillsRow: React.FC<AttachmentPillsRowProps> = ({
  attachments,
  removable = false,
  justifyContent = 'flexStart',
}) => {
  const { removeAttachment } = useConversationContext();

  if (attachments.length === 0) {
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
      {attachments.map((attachment, index) => (
        <EuiFlexItem key={attachment.id ?? `${attachment.type}-${index}`} grow={false}>
          <AttachmentPill
            attachment={attachment as Attachment}
            onRemoveAttachment={removable ? () => removeAttachment?.(index) : undefined}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
