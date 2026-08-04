/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Storybook mock — removes useConversationContext dependency from AttachmentPillsRow.
// Uses real AttachmentPill for accurate visual output.

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { isAttachmentGroup } from '@kbn/agent-builder-common/attachments';
import { AttachmentPill } from '../attachment_pill';

export interface AttachmentPillsRowProps {
  attachments: ConversationAttachment[];
  removable?: boolean;
}

export const AttachmentPillsRow: React.FC<AttachmentPillsRowProps> = ({
  attachments,
  removable = false,
}) => {
  if (attachments.length === 0) return null;

  return (
    <EuiFlexGroup gutterSize="s" wrap responsive={false} role="list" aria-label="Attachments">
      {attachments.map((attachment, index) => {
        if (isAttachmentGroup(attachment)) return null;
        const id = attachment.id ?? `${attachment.type}-${index}`;
        return (
          <EuiFlexItem key={id} grow={false}>
            <AttachmentPill
              attachment={{ id, type: attachment.type, data: (attachment.data ?? {}) as Record<string, unknown> }}
              onRemoveAttachment={removable ? () => {} : undefined}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
