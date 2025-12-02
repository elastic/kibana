/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadgeGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { Attachment } from '@kbn/onechat-common/attachments';
import type { AttachmentType } from '@kbn/onechat-common/attachments';
import { AttachmentPill } from './attachment_pill';

export interface AttachmentPillsRowProps {
  attachments: Attachment[];
}

const labels = {
  attachments: i18n.translate('xpack.onechat.attachmentPillsRow.attachments', {
    defaultMessage: 'Attachments',
  }),
};

export const AttachmentPillsRow: React.FC<AttachmentPillsRowProps> = ({ attachments }) => {
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
      {attachments.map((attachment: Attachment) => (
        <AttachmentPill
          key={attachment.id}
          id={attachment.id}
          type={attachment.type as AttachmentType}
        />
      ))}
    </EuiBadgeGroup>
  );
};
