/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadgeGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AttachmentPill } from './attachment_pill';

export interface AttachmentItem {
  /** Unique identifier for the attachment */
  id: string;
  /** Type of the attachment */
  type: string;
  /** Optional display name */
  name?: string;
  /** Whether the attachment is hidden from the user */
  hidden?: boolean;
}

export interface AttachmentPillsRowProps {
  /** List of attachments to display */
  attachments: AttachmentItem[];
  /** Optional callback when an attachment is removed */
  onRemoveAttachment?: (id: string) => void;
}

const labels = {
  attachments: i18n.translate('xpack.onechat.attachmentPillsRow.attachments', {
    defaultMessage: 'Attachments',
  }),
};

/**
 * A row of attachment pills. Only shows non-hidden attachments.
 */
export const AttachmentPillsRow: React.FC<AttachmentPillsRowProps> = ({
  attachments,
  onRemoveAttachment,
}) => {
  // Filter out hidden attachments
  const visibleAttachments = attachments.filter((attachment) => !attachment.hidden);

  if (visibleAttachments.length === 0) {
    return null;
  }

  return (
    <EuiBadgeGroup
      gutterSize="s"
      role="list"
      aria-label={labels.attachments}
      data-test-subj="onechatAttachmentPillsRow"
    >
      {visibleAttachments.map((attachment) => (
        <AttachmentPill
          key={attachment.id}
          id={attachment.id}
          type={attachment.type}
          name={attachment.name}
          onRemove={onRemoveAttachment}
        />
      ))}
    </EuiBadgeGroup>
  );
};
